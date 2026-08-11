// ReachOS runner: one shared, always-on process that services every
// tenant's connections (not one process per user/connection — see
// README.md for the earlier local-only setup this replaced). Polls the
// same /api/extension/* queue the Chrome extension uses (see extension/),
// but executes actions with a headless Playwright browser authenticated
// via a saved LinkedIn session cookie (li_at) instead of riding the user's
// own logged-in browser. From LinkedIn's point of view this looks like a
// login from a new device/location — expect a possible verification
// prompt the first time. See README.md before running this against a real
// account.
import { chromium } from "playwright";

const BACKEND_URL = (process.env.REACHOS_BACKEND_URL || "").replace(/\/$/, "");
const MASTER_KEY = process.env.RUNNER_MASTER_KEY;
const HEADLESS = process.env.REACHOS_HEADLESS !== "false";
const POLL_INTERVAL_MS = Number(process.env.REACHOS_POLL_INTERVAL_SECONDS || 180) * 1000;

if (!BACKEND_URL || !MASTER_KEY) {
  console.error("Imposta REACHOS_BACKEND_URL e RUNNER_MASTER_KEY in runner/.env (vedi .env.example).");
  process.exit(1);
}

async function listConnections() {
  const res = await fetch(`${BACKEND_URL}/api/runner/connections`, {
    headers: { Authorization: `Bearer ${MASTER_KEY}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(
      `[ReachOS runner] impossibile elencare le connessioni (HTTP ${res.status}): ${body.error || "(nessun dettaglio)"}`
    );
    return [];
  }
  const data = await res.json();
  return data.connections ?? [];
}

async function fetchSessionCookie(token) {
  const res = await fetch(`${BACKEND_URL}/api/extension/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `session fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.sessionCookie;
}

async function nextAction(token) {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-action`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.action;
}

async function report(token, actionId, result) {
  await fetch(`${BACKEND_URL}/api/extension/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ actionId, ...result }),
  });
}

// Sequence-engine equivalent of nextAction/report above — polls
// /api/extension/next-sequence-action instead of next-action, and reports
// to report-sequence-action. Kept as separate functions (rather than
// merging with nextAction/report) since the two systems' action shapes
// and report payloads differ slightly (connected/replied fields here vs.
// none on the legacy path) and run through genuinely different backend
// code (src/lib/execution/engine.ts vs. src/lib/automation/scheduler.ts) —
// see that engine's own comments for why. Both queues are polled from the
// same tickForConnection loop below.
async function nextSequenceAction(token) {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-sequence-action`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.action;
}

async function reportSequenceAction(token, actionId, result) {
  await fetch(`${BACKEND_URL}/api/extension/report-sequence-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ actionId, ...result }),
  });
}

async function nextScrapeJob(token) {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-scrape-job`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.job;
}

async function reportScrape(token, jobId, result) {
  await fetch(`${BACKEND_URL}/api/extension/report-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jobId, ...result }),
  });
}

async function nextLoginJob(token) {
  const res = await fetch(`${BACKEND_URL}/api/extension/next-login-job`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.job;
}

async function reportLogin(token, result) {
  await fetch(`${BACKEND_URL}/api/extension/report-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(result),
  });
}

// Polls for the verification code the user submits in the app while this
// browser session sits on LinkedIn's checkpoint page waiting. Gives up
// after timeoutMs so a login attempt can't hold a browser open forever if
// the user never checks their email.
async function pollLoginCode(token, attemptId, timeoutMs = 10 * 60 * 1000, intervalMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BACKEND_URL}/api/extension/login-attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${token}` },
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

async function runLoginJob(token, job) {
  const loginBrowser = await chromium.launch({ headless: HEADLESS });
  const loginContext = await loginBrowser.newContext();
  const page = await loginContext.newPage();
  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 30000 });

    // A cookie-consent banner (OneTrust or LinkedIn's own) can overlay the
    // form and block the username field from being interactable even
    // though it's present in the DOM — dismiss it first if present. Short
    // timeout and swallowed error since most of the time there's nothing
    // to dismiss at all.
    await page
      .locator('#onetrust-accept-btn-handler, button:has-text("Accetta"), button:has-text("Accept")')
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});

    try {
      await page.locator('input[type="email"], input#username').first().fill(job.email);
    } catch (e) {
      // The bare Playwright timeout ("Timeout 30000ms exceeded") gives no
      // clue why the field never appeared — LinkedIn may have served an
      // anti-automation checkpoint instead of the normal login form for
      // this request (headless browser + shared/CI IP is exactly the kind
      // of traffic it's built to catch). Recording the URL/title LinkedIn
      // actually served at the point of failure turns "the runner is
      // broken" into "LinkedIn showed X page instead" the next time this
      // happens.
      const diagUrl = page.url();
      const diagTitle = await page.title().catch(() => "");
      // Tag/id/name alone (the previous version of this diagnostic) turned
      // out uninformative — real form fields and a cookie-consent widget's
      // inputs look identical by tag name alone. Visible text is what
      // actually distinguishes "this is the login form" from "this is a
      // cookie banner" from "this is a bot checkpoint".
      const diagBodyText = await page
        .locator("body")
        .innerText({ timeout: 2000 })
        .then((t) => t.replace(/\s+/g, " ").trim().slice(0, 500))
        .catch(() => "(impossibile leggere il testo della pagina)");
      const diagInteractive = await page
        .locator("input, button, a")
        .evaluateAll((els) =>
          els
            .slice(0, 30)
            .map((el) => {
              const label =
                (el.textContent || "").trim().slice(0, 30) ||
                el.getAttribute("aria-label") ||
                el.getAttribute("placeholder") ||
                "";
              return `${el.tagName.toLowerCase()}${el.type ? `[type=${el.type}]` : ""}"${label}"`;
            })
            .join(", ")
        )
        .catch(() => "(impossibile leggere il DOM)");
      throw new Error(
        `${e?.message || e} — pagina ottenuta: "${diagTitle}" (${diagUrl}) — testo pagina: "${diagBodyText}" — elementi: ${diagInteractive}`
      );
    }
    const passwordField = page.locator('input[type="password"], input#password').first();
    await passwordField.fill(job.password);
    // LinkedIn's current sign-in button is a plain <button type="button">
    // wired to a JS click handler, not a native form submit — a
    // button[type="submit"] selector never matches it (this is exactly
    // what stalled here before the #username fix). Enter in the password
    // field submits the surrounding <form> regardless of the button's own
    // type, so it doesn't depend on LinkedIn's button markup at all.
    await passwordField.press("Enter");
    await page.waitForTimeout(3000);

    let outcome = await classifyLoginOutcome(page);

    if (outcome.kind === "verification_code") {
      await reportLogin(token, {
        attemptId: job.attemptId,
        status: "awaiting_verification",
        verificationPrompt: outcome.prompt,
      });

      const code = await pollLoginCode(token, job.attemptId);
      if (!code) {
        await reportLogin(token, {
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
      await codeInput.press("Enter");
      await page.waitForTimeout(3000);
      outcome = await classifyLoginOutcome(page);
    }

    if (outcome.kind === "success") {
      const cookies = await loginContext.cookies();
      const liAt = cookies.find((c) => c.name === "li_at");
      if (!liAt) {
        await reportLogin(token, {
          attemptId: job.attemptId,
          status: "failed",
          error: "Login riuscito ma il cookie li_at non è stato trovato nel contesto del browser.",
        });
        return;
      }
      await reportLogin(token, { attemptId: job.attemptId, status: "success", sessionCookie: liAt.value });
      return;
    }

    await reportLogin(token, {
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

// Opens a fresh browser context authenticated with this connection's saved
// session cookie. Not cached across ticks — with potentially many tenants'
// connections serviced by one shared process, keeping N persistent browsers
// open isn't worth the memory; a job (or none) happens at most once per
// connection per cycle anyway, so relaunching is cheap by comparison.
async function openConnectionContext(token) {
  const sessionCookie = await fetchSessionCookie(token);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext();
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
  return { browser, context };
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

async function checkForReply(page) {
  // Best-effort, same caveat as everything else in this file: opens the
  // existing message thread with the lead (via the "Message" button on
  // their profile) and looks at who sent the most recent bubble. LinkedIn
  // marks the current user's own messages with the "msg-s-event-listitem"
  // variant classes vs. the other person's — untested against a live
  // thread, adjust the selector below if it comes back wrong.
  const clicked = await clickByText(page, "Message");
  if (!clicked) {
    // No thread / not connected yet — nothing to reply to.
    return { success: true, replied: false };
  }
  await page.waitForTimeout(1500);

  const lastIsFromLead = await page.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll("li.msg-s-message-list__event"));
    if (bubbles.length === 0) return false;
    const last = bubbles[bubbles.length - 1];
    // The other person's messages carry this modifier class on LinkedIn's
    // current messaging UI; our own outgoing bubbles don't.
    return Boolean(last.querySelector(".msg-s-event-listitem--other"));
  });

  return { success: true, replied: Boolean(lastIsFromLead) };
}

// Splits a headline like "Software Engineer at TechCorp" or "Ingegnere
// presso TechCorp" into { position, company }. Best-effort text heuristic,
// not a real parser — headlines are free text and plenty won't match any
// separator (e.g. "Helping B2B teams grow"), in which case both come back
// empty and only the raw headline is kept. Untested against a live session,
// same caveat as the rest of this file (see README.md).
function splitHeadline(headline) {
  const separators = [" at ", " @ ", " presso ", " chez ", " bei ", " en ", " | ", " · "];
  for (const sep of separators) {
    const idx = headline.toLowerCase().indexOf(sep.toLowerCase());
    if (idx === -1) continue;
    return {
      position: headline.slice(0, idx).trim(),
      company: headline.slice(idx + sep.length).trim(),
    };
  }
  return { position: "", company: "" };
}

async function scrapeSearchResults(page) {
  // Best-effort extraction: LinkedIn/Sales Navigator result cards differ by
  // layout and change often (untested against a live session — see
  // README.md). This grabs every profile link on the page and tries to find
  // a headline and location near it; it will need adjustment if it comes
  // back empty.
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
      let location = "";
      const card = a.closest('li, div[data-chameleon-result-urn], div.entity-result');
      if (card) {
        const headlineEl = card.querySelector(
          '.entity-result__primary-subtitle, [data-anonymize="title"], .t-14.t-black.t-normal'
        );
        headline = headlineEl?.textContent?.trim() || "";

        // Location typically renders as a second subtitle line right below
        // the headline on both classic search and Sales Navigator cards.
        const locationEl = card.querySelector(
          '.entity-result__secondary-subtitle, [data-anonymize="location"], .t-12.t-black--light.t-normal'
        );
        location = locationEl?.textContent?.trim() || "";
      }

      out.push({ profileUrl, name, headline, location });
    }
    return out;
  });

  return results.map((r) => {
    const [firstName, ...rest] = r.name.split(" ");
    const { position, company } = splitHeadline(r.headline);
    return {
      linkedinUrl: r.profileUrl,
      firstName: firstName || "",
      lastName: rest.join(" "),
      headline: r.headline,
      location: r.location,
      company,
      position,
      // Not shown on LinkedIn/Sales Navigator search-result cards at all
      // (only on the full profile page), so there's nothing to scrape here
      // without an extra per-lead page visit — left empty on purpose.
      industry: "",
    };
  });
}

async function runScrapeJob(token, job) {
  const { browser, context } = await openConnectionContext(token);
  try {
    const page = await context.newPage();
    await page.goto(job.searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const leads = await scrapeSearchResults(page);
    if (leads.length === 0) {
      return { success: false, error: "Nessun risultato estratto dalla pagina (selettore da aggiornare?)." };
    }
    return { success: true, leads };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runAction(token, action) {
  const { browser, context } = await openConnectionContext(token);
  try {
    const page = await context.newPage();
    await page.goto(action.leadLinkedinUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    switch (action.type) {
      case "send_connection_request":
        return await sendConnectionRequest(page, action.text);
      case "check_acceptance":
        return await checkAcceptance(page);
      case "send_message":
        return await sendMessage(page, action.text);
      case "check_reply":
        return await checkForReply(page);
      default:
        return { success: false, error: `Azione sconosciuta: ${action.type}` };
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// Action types the sequence engine can define on a step but that have no
// real Playwright implementation yet (Phase 12 territory) — reported as an
// honest failure rather than pretending to do something. Keeping this as
// an explicit list (not just falling through a switch's default) makes it
// obvious at a glance which of the six SEQUENCE_ACTION_TYPES
// (src/lib/sequences/types.ts) are and aren't wired up.
const NOT_YET_IMPLEMENTED_ACTIONS = new Set(["view_profile", "like_recent_post", "follow_profile", "manual_linkedin_action"]);

async function runSequenceAction(token, action) {
  if (NOT_YET_IMPLEMENTED_ACTIONS.has(action.type)) {
    return { success: false, error: `Azione non ancora implementata: ${action.type}` };
  }

  const { browser, context } = await openConnectionContext(token);
  try {
    const page = await context.newPage();
    await page.goto(action.leadLinkedinUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    switch (action.type) {
      case "send_connection_request":
        return await sendConnectionRequest(page, action.text);
      case "send_message":
        return await sendMessage(page, action.text);
      case "check_connection_status": {
        const result = await checkAcceptance(page);
        // checkAcceptance's field is named "accepted" (it's shared with the
        // legacy check_acceptance action type) — the sequence engine's
        // report-sequence-action route expects "connected" instead.
        return { success: result.success, error: result.error, connected: result.accepted };
      }
      case "check_reply":
        return await checkForReply(page);
      default:
        return { success: false, error: `Azione sconosciuta: ${action.type}` };
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// At most one job per connection per cycle, same priority as before
// (pending login blocks everything else for that connection, since there's
// no session cookie yet to run regular actions with). Errors are caught
// per-connection so one broken/expired connection never stops the shared
// process from servicing everyone else.
async function tickForConnection(conn) {
  const loginJob = await nextLoginJob(conn.token);
  if (loginJob) {
    console.log(`[ReachOS runner] [${conn.label}] login automatico LinkedIn per ${loginJob.email}`);
    try {
      await runLoginJob(conn.token, loginJob);
    } catch (e) {
      console.error(`[ReachOS runner] [${conn.label}] errore login:`, e);
      await reportLogin(conn.token, {
        attemptId: loginJob.attemptId,
        status: "failed",
        error: String(e?.message || e),
      });
    }
    return;
  }

  const action = await nextAction(conn.token);
  if (action) {
    console.log(`[ReachOS runner] [${conn.label}] eseguo ${action.type} per ${action.leadFirstName || action.leadLinkedinUrl}`);
    let result;
    try {
      result = await runAction(conn.token, action);
    } catch (e) {
      result = { success: false, error: String(e?.message || e) };
    }
    console.log(`[ReachOS runner] [${conn.label}] esito:`, result);
    await report(conn.token, action.id, result);
    return;
  }

  const sequenceAction = await nextSequenceAction(conn.token);
  if (sequenceAction) {
    console.log(
      `[ReachOS runner] [${conn.label}] eseguo (sequence) ${sequenceAction.type} per ${sequenceAction.leadFirstName || sequenceAction.leadLinkedinUrl}`
    );
    let result;
    try {
      result = await runSequenceAction(conn.token, sequenceAction);
    } catch (e) {
      result = { success: false, error: String(e?.message || e) };
    }
    console.log(`[ReachOS runner] [${conn.label}] esito (sequence):`, result);
    await reportSequenceAction(conn.token, sequenceAction.id, result);
    return;
  }

  const job = await nextScrapeJob(conn.token);
  if (job) {
    console.log(`[ReachOS runner] [${conn.label}] eseguo scrape (${job.sourceType}) -> ${job.searchUrl}`);
    let result;
    try {
      result = await runScrapeJob(conn.token, job);
    } catch (e) {
      result = { success: false, error: String(e?.message || e) };
    }
    console.log(
      `[ReachOS runner] [${conn.label}] esito scrape:`,
      result.success ? `${result.leads.length} lead trovati` : result.error
    );
    await reportScrape(conn.token, job.id, result);
  }
}

async function tick() {
  const connections = await listConnections();
  if (connections.length === 0) {
    console.log("[ReachOS runner] nessuna connessione da servire al momento.");
    return;
  }
  for (const conn of connections) {
    try {
      await tickForConnection(conn);
    } catch (e) {
      console.error(`[ReachOS runner] [${conn.label || conn.id}] errore nel ciclo:`, e);
    }
  }
}

async function loop() {
  console.log(
    `[ReachOS runner] avviato (modalità condivisa multi-tenant) — poll ogni ${POLL_INTERVAL_MS / 1000}s, headless=${HEADLESS}`
  );
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[ReachOS runner] errore nel ciclo:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGINT", () => {
  console.log("\n[ReachOS runner] arresto...");
  process.exit(0);
});

// RUN_ONCE=true: do a single pass over every connection and exit, instead of
// looping forever. This is what lets the runner live as a free scheduled
// GitHub Actions job (a fresh container per run, see
// .github/workflows/runner.yml) instead of needing a paid always-on host —
// the trade-off is checking every N minutes (however often the workflow is
// scheduled) instead of continuously, which is fine for this use case
// (nothing here needs sub-minute latency).
if (process.env.RUN_ONCE === "true") {
  tick()
    .catch((e) => {
      console.error("[ReachOS runner] errore nel ciclo:", e);
      process.exitCode = 1;
    })
    // Deliberately not calling process.exit() here: under CI, stdout is a
    // pipe, and Node's writes to pipes are asynchronous — an immediate
    // process.exit() can silently drop buffered console.log/error output
    // written just before it (this is how every run ended up with zero
    // logs even on success). Setting process.exitCode and letting Node
    // exit naturally once the event loop is empty lets the output flush
    // first; every browser context is already closed via `finally` blocks
    // earlier in the pass, so nothing should be left keeping the process
    // alive.
    .finally(() => {});
} else {
  loop();
}
