// Runs on linkedin.com pages. Executes the DOM actions the background
// script asks for (send_connection_request, check_acceptance, send_message).
//
// IMPORTANT: LinkedIn's DOM is not public/stable API — these selectors are
// best-effort, based on commonly documented LinkedIn UI patterns, and have
// NOT been verified against a live LinkedIn session (this was built without
// access to a real LinkedIn account). They will likely need adjustment.
// To fix a broken selector: open the target LinkedIn page, DevTools →
// inspect the button in question, and update the matching function below.
// See README.md for how to test safely.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.reachosAction) return;
  handle(msg)
    .then(sendResponse)
    .catch((e) => sendResponse({ success: false, error: String(e?.message || e) }));
  return true; // keep the message channel open for the async response
});

async function handle(msg) {
  switch (msg.reachosAction) {
    case "send_connection_request":
      return sendConnectionRequest(msg.text);
    case "check_acceptance":
      return checkAcceptance();
    case "send_message":
      return sendMessage(msg.text);
    default:
      return { success: false, error: `Azione sconosciuta: ${msg.reachosAction}` };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(selectorFn, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = selectorFn();
    if (el) return el;
    await sleep(200);
  }
  return null;
}

function findButtonByText(text) {
  const needle = text.trim().toLowerCase();
  const candidates = Array.from(document.querySelectorAll('button, div[role="button"]'));
  return candidates.find((b) => b.innerText?.trim().toLowerCase() === needle);
}

async function sendConnectionRequest(note) {
  let connectButton = await waitFor(
    () => findButtonByText("Connect") || document.querySelector('button[aria-label*="Connect" i]')
  );

  if (!connectButton) {
    // "Connect" is sometimes tucked under a "More" overflow menu on some
    // profile layouts.
    const moreButton = findButtonByText("More") || document.querySelector('button[aria-label*="More actions" i]');
    if (moreButton) {
      moreButton.click();
      await sleep(500);
      connectButton = await waitFor(() => findButtonByText("Connect"), 3000);
    }
  }

  if (!connectButton) {
    return {
      success: false,
      error: "Bottone 'Connect' non trovato (già connesso, richiesta già in sospeso, o selettore da aggiornare).",
    };
  }

  connectButton.click();
  await sleep(800);

  if (note && note.trim()) {
    const addNoteButton = await waitFor(() => findButtonByText("Add a note"), 3000);
    if (addNoteButton) {
      addNoteButton.click();
      await sleep(500);
      const textarea = await waitFor(
        () => document.querySelector("textarea#custom-message, textarea[name='message']"),
        3000
      );
      if (textarea) {
        textarea.value = note;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  const sendButton = await waitFor(
    () =>
      findButtonByText("Send") ||
      findButtonByText("Send invitation") ||
      findButtonByText("Send without a note"),
    4000
  );
  if (!sendButton) {
    return { success: false, error: "Bottone 'Send' non trovato dopo aver cliccato Connect." };
  }
  sendButton.click();

  return { success: true };
}

async function checkAcceptance() {
  await sleep(1500);
  const connectButton = findButtonByText("Connect") || document.querySelector('button[aria-label*="Connect" i]');
  const pendingButton = findButtonByText("Pending");
  const messageButton = findButtonByText("Message") || document.querySelector('a[href*="/messaging/thread/"]');

  if (messageButton && !connectButton) {
    return { success: true, accepted: true };
  }
  if (pendingButton || connectButton) {
    return { success: true, accepted: false };
  }
  return { success: false, error: "Stato della connessione non determinabile (selettore da aggiornare)." };
}

async function sendMessage(text) {
  const messageButton = await waitFor(
    () => findButtonByText("Message") || document.querySelector('a[href*="/messaging/thread/"]')
  );
  if (!messageButton) {
    return { success: false, error: "Bottone 'Message' non trovato: probabilmente non ancora connesso." };
  }
  messageButton.click();

  const editor = await waitFor(
    () => document.querySelector('div.msg-form__contenteditable[contenteditable="true"]'),
    6000
  );
  if (!editor) {
    return { success: false, error: "Editor messaggio non trovato." };
  }
  editor.focus();
  document.execCommand("insertText", false, text);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(300);

  const sendButton = await waitFor(() => findButtonByText("Send"), 3000);
  if (!sendButton) {
    return { success: false, error: "Bottone 'Send' del messaggio non trovato." };
  }
  sendButton.click();

  return { success: true };
}
