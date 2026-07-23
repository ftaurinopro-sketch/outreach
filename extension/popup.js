const backendUrlInput = document.getElementById("backendUrl");
const tokenInput = document.getElementById("token");
const status = document.getElementById("status");

chrome.storage.local.get(["backendUrl", "token"], (data) => {
  if (data.backendUrl) backendUrlInput.value = data.backendUrl;
  if (data.token) tokenInput.value = data.token;
  render();
});

document.getElementById("save").addEventListener("click", () => {
  const backendUrl = backendUrlInput.value.trim().replace(/\/$/, "");
  const token = tokenInput.value.trim();
  chrome.storage.local.set({ backendUrl, token }, () => {
    status.textContent = "Salvato.";
    render();
  });
});

document.getElementById("pollNow").addEventListener("click", () => {
  chrome.runtime.sendMessage({ reachosPollNow: true });
  status.textContent = "Controllo in corso... (guarda la console del service worker per i log)";
});

function render() {
  status.textContent =
    backendUrlInput.value && tokenInput.value
      ? "Configurato. Poll automatico ogni 3 minuti."
      : "Non configurato: inserisci URL e token, poi Salva.";
}
