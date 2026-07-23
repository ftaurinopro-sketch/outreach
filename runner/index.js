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
