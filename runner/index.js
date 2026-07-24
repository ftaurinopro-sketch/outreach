// ReachOS runner: polls the same /api/extension/* queue the Chrome extension
// uses (see extension/), but executes actions with a headless Playwright
// browser authenticated via a saved LinkedIn session cookie (li_at) instead
// of riding the user's own logged-in browser. From LinkedIn's point of view
// this looks like a login from a new device/location — expect a possible
// verification prompt the first time. See README.md before running this
// against a real account.
import { chromium } from "playwright";

const BACKEND_URL = (process.env.REACHOS_BACKEND_URL || "").replace(/\/$/, "");
const TOKEN = process.env.REACHOS_TOKEN;
const HEADLESS = process.env.REACHOS_HEADLESS !== "false";
const POLL_INTERVAL_MS = Number(process.env.REACHOS_POLL_INTERVAL_SECONDS || 180) * 1000;

if (!BACKEND_URL || !TOKEN) {
  console.error("Imposta REACHOS_BACKEND_URL e REACHOS_TOKEN in runner/.env (vedi .env.example).");
  process.exit(1);
}

let browser = null;
let context = null;

async function fetchSessionCookie() {
  const res = await fetch(`${BACKEND_URL}/api/extension/session`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `session fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.sessionCookie;
}

async function nextAction() {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-action`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.action;
}

async function report(actionId, result) {
  await fetch(`${BACKEND_URL}/api/extension/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ actionId, ...result }),
  });
}

async function nextScrapeJob() {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-scrape-job`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.job;
}

async function reportScrape(jobId, result) {
  await fetch(`${BACKEND_URL}/api/extension/report-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ jobId, ...result }),
  });
}

async function nextLoginJob() {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-login-job`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.job;
}

async function reportLogin(result) {
  await fetch(`${BACKEND_URL}/api/extension/report-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(result),
  });
}

// Polls for the verification code the user submits in the app while this
// browser session sits on LinkedIn's checkpoint page waiting. Gives up
// after timeoutMs so a login attempt can't hold a browser open forever if
// the user never checks their email.
async function pollLoginCode(attemptId, timeoutMs = 10 * 60 * 1000, intervalMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BACKEND_URL}/api/extension/login-attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.verificationCode) return data.verificationCode;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

// Classifies what LinkedIn's login form did after a submit. Best-effort,
// unverified against a real account (same caveat as every other selector in
// this file) — three real outcomes are handled: a clean success (nav bar
// present), an email/SMS verification-code checkpoint (the only challenge
// type this can drive automatically, since it's just a code the user
// relays from their inbox/phone), and everything else (wrong credentials,
// CAPTCHA, "approve from your phone" 2FA) which gets reported as a failure
// pointing back at the manual-cookie fallback in the app — there is no way
// to solve a CAPTCHA or an out-of-band app approval from here.
async function classifyLoginOutcome(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const url = page.url();

  const hasNav = (await page.locator("#global-nav, nav.global-nav").count()) > 0;
  if (hasNav) return { kind: "success" };

  if (url.includes("/checkpoint/")) {
    const codeInput = page
      .locator('input[name="pin"], input#input__email_verification_pin, input[autocomplete="one-time-code"]')
      .first();
    if (await codeInput.count()) {
      const promptEl = page.locator('h1, .form__label, [data-test-id="challenge-page-title"]').first();
      const prompt = (await promptEl.count()) ? (await promptEl.innerText().catch(() => "")).trim() : "";
      return { kind: "verification_code", prompt: prompt || "LinkedIn richiede un codice di verifica." };
    }
    return {
      kind: "unsupported_challenge",
      message:
        "LinkedIn ha richiesto una verifica che non può essere completata automaticamente (CAPTCHA o approvazione dall'app) — accedi manualmente da un browser e incolla il cookie di sessione da /connections.",
    };
  }

  const errorEl = page.locator("#error-for-username, #error-for-password, .form__label--error").first();
  if (await errorEl.count()) {
    const message = ((await errorEl.innerText().catch(() => "")) || "Credenziali non valide.").trim();
    return { kind: "error", message };
  }

  return { kind: "unknown", message: "Esito del login non determinabile (selettore da aggiornare?)." };
}

async function runLoginJob(job) {
  const loginBrowser = await chromium.launch({ headless: HEADLESS });
  const loginContext = await loginBrowser.newContext();
  const page = await loginContext.newPage();
  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator("#username").fill(job.email);
    await page.locator("#password").fill(job.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    let outcome = await classifyLoginOutcome(page);

    if (outcome.kind === "verification_code") {
      await reportLogin({
        attemptId: job.attemptId,
        status: "awaiting_verification",
        verificationPrompt: outcome.prompt,
      });

      const code = await pollLoginCode(job.attemptId);
      if (!code) {
        await reportLogin({
          attemptId: job.attemptId,
          status: "failed",
          error: "Tempo scaduto in attesa del codice di verifica (10 minuti).",
        });
        return;
      }

      const codeInput = page
        .locator('input[name="pin"], input#input__email_verification_pin, input[autocomplete="one-time-code"]')
        .first();
      await codeInput.fill(code);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
      outcome = await classifyLoginOutcome(page);
    }

    if (outcome.kind === "success") {
      const cookies = await loginContext.cookies();
      const liAt = cookies.find((c) => c.name === "li_at");
      if (!liAt) {
        await reportLogin({
          attemptId: job.attemptId,
          status: "failed",
          error: "Login riuscito ma il cookie li_at non è stato trovato nel contesto del browser.",
        });
        return;
      }
      await reportLogin({ attemptId: job.attemptId, status: "success", sessionCookie: liAt.value });
      return;
    }

    await reportLogin({
      attemptId: job.attemptId,
      status: "failed",
      error: outcome.message || "Login non riuscito.",
    });
  } finally {
    await page.close().catch(() => {});
    await loginContext.close().catch(() => {});
    await loginBrowser.close().catch(() => {});
  }
}

async function getContext() {
  if (context) return context;
  const sessionCookie = await fetchSessionCookie();

  browser = await chromium.launch({ headless: HEADLESS });
  context = await browser.newContext();
  await context.addCookies([
    {
      name: "li_at",
      value: sessionCookie,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: true,
      secure: true,
    },
  ]);
  return context;
}

async function clickByText(page, text) {
  const locator = page.getByRole("button", { name: text, exact: true }).first();
  if (await locator.count()) {
    await locator.click();
    return true;
  }
  return false;
}

async function sendConnectionRequest(page, note) {
  let clicked = await clickByText(page, "Connect");
  if (!clicked) {
    const openedMore = await clickByText(page, "More");
    if (openedMore) {
      await page.waitForTimeout(500);
      clicked = await clickByText(page, "Connect");
    }
  }
  if (!clicked) {
    return {
      success: false,
      error: "Bottone 'Connect' non trovato (già connesso, richiesta pendente, o selettore da aggiornare).",
    };
  }

  await page.waitForTimeout(800);

  if (note && note.trim()) {
    const addedNote = await clickByText(page, "Add a note");
    if (addedNote) {
      await page.waitForTimeout(500);
      const textarea = page.locator("textarea#custom-message, textarea[name='message']").first();
      if (await textarea.count()) {
        await textarea.fill(note);
      }
    }
  }

  const sent =
    (await clickByText(page, "Send invitation")) ||
    (await clickByText(page, "Send")) ||
    (await clickByText(page, "Send without a note"));

  if (!sent) {
    return { success: false, error: "Bottone 'Send' non trovato dopo aver cliccato Connect." };
  }
  return { success: true };
}

async function checkAcceptance(page) {
  await page.waitForTimeout(1000);
  const hasConnect = (await page.getByRole("button", { name: "Connect", exact: true }).count()) > 0;
  const hasMessage = (await page.getByRole("button", { name: "Message", exact: true }).count()) > 0;

  if (hasMessage && !hasConnect) return { success: true, accepted: true };
  if (hasConnect) return { success: true, accepted: false };
  return { success: false, error: "Stato della connessione non determinabile (selettore da aggiornare)." };
}

async function sendMessage(page, text) {
  const clicked = await clickByText(page, "Message");
  if (!clicked) {
    return { success: false, error: "Bottone 'Message' non trovato: probabilmente non ancora connesso." };
  }
  await page.waitForTimeout(1500);

  const editor = page.locator('div.msg-form__contenteditable[contenteditable="true"]').first();
  if (!(await editor.count())) {
    return { success: false, error: "Editor messaggio non trovato." };
  }
  await editor.click();
  await editor.type(text);
  await page.waitForTimeout(300);

  const sent = await clickByText(page, "Send");
  if (!sent) {
    return { success: false, error: "Bottone 'Send' del messaggio non trovato." };
  }
  return { success: true };
}

async function scrapeSearchResults(page) {
  // Best-effort extraction: LinkedIn/Sales Navigator result cards differ by
  // layout and change often (untested against a live session — see
  // README.md). This grabs every profile link on the page and tries to find
  // a headline near it; it will need adjustment if it comes back empty.
  const results = await page.evaluate(() => {
    const seen = new Set();
    const out = [];
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));

    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      const match = href.match(/\/in\/([^/?]+)/);
      if (!match) continue;

      const profileUrl = `https://www.linkedin.com/in/${match[1]}`;
      if (seen.has(profileUrl)) continue;

      const name = (a.innerText || "").trim().split("\n")[0].trim();
      if (!name) continue;
      seen.add(profileUrl);

      let headline = "";
      const card = a.closest('li, div[data-chameleon-result-urn], div.entity-result');
      if (card) {
        const headlineEl = card.querySelector(
          '.entity-result__primary-subtitle, [data-anonymize="title"], .t-14.t-black.t-normal'
        );
        headline = headlineEl?.textContent?.trim() || "";
      }

      out.push({ profileUrl, name, headline });
    }
    return out;
  });

  return results.map((r) => {
    const [firstName, ...rest] = r.name.split(" ");
    return {
      linkedinUrl: r.profileUrl,
      firstName: firstName || "",
      lastName: rest.join(" "),
      headline: r.headline,
      location: "",
      company: "",
      position: "",
      industry: "",
    };
  });
}

async function runScrapeJob(job) {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(job.searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const leads = await scrapeSearchResults(page);
    if (leads.length === 0) {
      return { success: false, error: "Nessun risultato estratto dalla pagina (selettore da aggiornare?)." };
    }
    return { success: true, leads };
  } finally {
    await page.close();
  }
}

async function runAction(action) {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(action.leadLinkedinUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    switch (action.type) {
      case "send_connection_request":
        return await sendConnectionRequest(page, action.text);
      case "check_acceptance":
        return await checkAcceptance(page);
      case "send_message":
        return await sendMessage(page, action.text);
      default:
        return { success: false, error: `Azione sconosciuta: ${action.type}` };
    }
  } finally {
    await page.close();
  }
}

async function tick() {
  // Checked first: a pending login blocks everything else for this
  // connection anyway (no session cookie yet to run regular actions with),
  // and the user is likely watching /connections live for the outcome.
  // Note this can hold the loop for up to ~10 minutes if LinkedIn asks for
  // a verification code — acceptable for a single-account personal runner,
  // but it does mean queued campaign actions wait behind it.
  const loginJob = await nextLoginJob();
  if (loginJob) {
    console.log(`[ReachOS runner] eseguo login automatico LinkedIn per ${loginJob.email}`);
    try {
      await runLoginJob(loginJob);
    } catch (e) {
      console.error("[ReachOS runner] errore login:", e);
      await reportLogin({ attemptId: loginJob.attemptId, status: "failed", error: String(e?.message || e) });
    }
    return;
  }

  const action = await nextAction();
  if (action) {
    console.log(`[ReachOS runner] eseguo ${action.type} per ${action.leadFirstName || action.leadLinkedinUrl}`);
    let result;
    try {
      result = await runAction(action);
    } catch (e) {
      result = { success: false, error: String(e?.message || e) };
    }
    console.log("[ReachOS runner] esito:", result);
    await report(action.id, result);
    return;
  }

  const job = await nextScrapeJob();
  if (job) {
    console.log(`[ReachOS runner] eseguo scrape (${job.sourceType}) -> ${job.searchUrl}`);
    let result;
    try {
      result = await runScrapeJob(job);
    } catch (e) {
      result = { success: false, error: String(e?.message || e) };
    }
    console.log(
      "[ReachOS runner] esito scrape:",
      result.success ? `${result.leads.length} lead trovati` : result.error
    );
    await reportScrape(job.id, result);
  }
}

async function loop() {
  console.log(`[ReachOS runner] avviato — poll ogni ${POLL_INTERVAL_MS / 1000}s, headless=${HEADLESS}`);
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[ReachOS runner] errore nel ciclo:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGINT", async () => {
  console.log("\n[ReachOS runner] arresto...");
  if (browser) await browser.close();
  process.exit(0);
});

loop();
