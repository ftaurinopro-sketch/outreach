# ReachOS Runner — esecutore cloud via cookie di sessione

Alternativa all'estensione Chrome (`extension/`): invece di eseguire le azioni nel tuo browser reale, il
runner usa un **browser headless (Playwright)** autenticato su LinkedIn tramite il cookie di sessione
`li_at`. Non serve tenere Chrome aperto: puoi far girare questo script sul tuo computer, o in futuro su un
piccolo server sempre acceso.

## ⚠️ Leggi prima di usarlo

- **LinkedIn vedrà questo come un accesso da un nuovo dispositivo/luogo.** È molto probabile che, al primo
  utilizzo, LinkedIn chieda una verifica (email/SMS) o mostri un avviso di sicurezza sull'account — è un
  comportamento normale per un login "nuovo", non un errore del runner. Tienilo d'occhio nella tua casella
  email collegata a LinkedIn.
- **Il cookie `li_at` equivale ad essere loggato sul tuo account.** Chiunque lo abbia può agire come te su
  LinkedIn. Viene salvato in chiaro nel database di ReachOS in questa prima versione (non ancora
  cifrato) — trattalo come una password, non condividerlo, e sappi che è un limite di sicurezza da
  migliorare più avanti.
- **Stessa violazione dei Termini di Servizio di LinkedIn** dell'estensione — stesso rischio di
  restrizione/ban dell'account.
- **Selettori DOM non testati contro LinkedIn reale** (stessa situazione dell'estensione — vedi
  `extension/README.md` per come sistemarli, la logica è la stessa, cambia solo l'API usata — Playwright
  invece del DOM del browser).
- **Testa prima su un account secondario**, con limiti bassi (i default in `/connections` sono 15
  connessioni/giorno, 80/settimana, 30 messaggi/giorno).
- **`chromium` non gira su Vercel** in questo setup: è un processo Node persistente, va eseguito sulla tua
  macchina o su un server/VPS proprio (Railway, Render, una piccola VM...), non come funzione serverless.

## Come trovare il cookie `li_at`

1. Vai su [linkedin.com](https://www.linkedin.com) già loggato con l'account da collegare
2. Apri DevTools (F12 o Cmd+Opt+I) → tab **Application** (Chrome) o **Storage** (Firefox)
3. Nel pannello a sinistra: Cookies → `https://www.linkedin.com`
4. Trova la riga `li_at` e copia il suo **Value**

Questo valore scade periodicamente (LinkedIn invalida le sessioni): se il runner smette di autenticarsi,
ripeti questi passaggi e aggiorna il cookie da `/connections` nell'app.

## Installazione

```bash
cd runner
npm install                      # installa anche Chromium via `playwright install chromium` (postinstall)
cp .env.example .env
```

Modifica `runner/.env`:
- `REACHOS_BACKEND_URL` — URL di ReachOS (es. `http://localhost:3213` in locale)
- `REACHOS_TOKEN` — token generato creando una connessione in `/connections`
- (il cookie `li_at` si imposta invece dalla UI di ReachOS, non da qui — il runner lo scarica da lì ad ogni
  avvio)

```bash
npm start
```

La prima volta, ti conviene mettere `REACHOS_HEADLESS=false` in `.env` per vedere il browser mentre lavora
e verificare che tutto funzioni come previsto.

## Come funziona

Stesso protocollo dell'estensione (`/api/extension/next-action`, `/api/extension/report`): il runner fa
polling ogni `REACHOS_POLL_INTERVAL_SECONDS` (default 180s), se c'è un'azione in coda apre una pagina
Playwright sul profilo del lead, esegue l'azione (`send_connection_request`, `check_acceptance`,
`send_message`) e riporta l'esito. La logica di pianificazione (quante azioni al giorno, quando ricontrollare
l'accettazione, quando mandare il follow-up) resta lato server in `src/lib/automation/scheduler.ts` — il
runner esegue solo quello che gli viene detto, un'azione alla volta.

Gestisce anche i **job di import da ricerca** (Lead Finder → "Importa da ricerca"): se non ci sono azioni di
campagna in coda, controlla `/api/extension/next-scrape-job`, apre l'URL di ricerca (LinkedIn o Sales
Navigator) ed estrae i risultati della prima pagina (`scrapeSearchResults` in `index.js`), poi li salva come
nuova lista lead tramite `/api/extension/report-scrape`. Estrae solo nome, headline e URL profilo dalla
pagina dei risultati — azienda/posizione/settore restano vuoti (non sempre presenti nella card di
risultato) e vanno eventualmente completati a mano o li popola l'agent quando serve.

## Se un selettore smette di funzionare

Stessa procedura dell'estensione: apri manualmente la pagina LinkedIn coinvolta, ispeziona il bottone con
DevTools, aggiorna la funzione corrispondente in `index.js` (`sendConnectionRequest`, `checkAcceptance`,
`sendMessage`).
