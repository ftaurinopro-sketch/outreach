// Service worker: polls the ReachOS backend for the next queued automation
// action, hands it to the content script running on linkedin.com, and
// reports the result back. Runs one action at a time on a fixed interval —
// the pacing/rate-limiting itself lives server-side (see
// src/lib/automation/scheduler.ts), this just executes what it's told.

const POLL_ALARM = "reachos-poll";
const POLL_PERIOD_MINUTES = 3;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) poll();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.reachosPollNow) poll();
});

async function getConfig() {
  const { backendUrl, token } = await chrome.storage.local.get(["backendUrl", "token"]);
  return { backendUrl, token };
}

async function poll() {
  const { backendUrl, token } = await getConfig();
  if (!backendUrl || !token) return;

  let action;
  try {
    const res = await fetch(`${backendUrl}/api/extension/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn("[ReachOS] next-action HTTP", res.status);
      return;
    }
    const data = await res.json();
    action = data.action;
  } catch (e) {
    console.warn("[ReachOS] poll fetch failed", e);
    return;
  }

  if (!action) return;

  let result;
  try {
    result = await runAction(action);
  } catch (e) {
    result = { success: false, error: String(e?.message || e) };
  }

  try {
    await fetch(`${backendUrl}/api/extension/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actionId: action.id, ...result }),
    });
  } catch (e) {
    console.warn("[ReachOS] report fetch failed", e);
  }
}

async function runAction(action) {
  const tab = await openOrReuseLinkedInTab(action.leadLinkedinUrl);
  await waitForTabComplete(tab.id);
  // Give the LinkedIn single-page app a moment to finish client-side
  // rendering after navigation before we start looking for buttons.
  await sleep(2500);

  return chrome.tabs.sendMessage(tab.id, {
    reachosAction: action.type,
    text: action.text,
  });
}

function openOrReuseLinkedInTab(url) {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: "https://www.linkedin.com/*" }, (tabs) => {
      const existing = tabs[0];
      if (existing) {
        chrome.tabs.update(existing.id, { url }, () => resolve(existing));
      } else {
        chrome.tabs.create({ url, active: false }, (tab) => resolve(tab));
      }
    });
  });
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(resolve, 15000); // safety timeout, in case 'complete' never fires
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
