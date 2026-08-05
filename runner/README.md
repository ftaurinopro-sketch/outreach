# ReachOS Runner — esecutore condiviso via cookie di sessione

Alternativa all'estensione Chrome (`extension/`): invece di eseguire le azioni nel browser di ogni singolo
utente, il runner usa un **browser headless (Playwright)** autenticato su LinkedIn tramite il cookie di
sessione `li_at`.

**Un solo processo serve automaticamente tutte le connessioni di tutti gli utenti** della piattaforma — non
è un'installazione che ogni cliente deve fare per conto proprio. Va fatto girare una volta sola, su un
server sempre acceso (vedi "Dove farlo girare" sotto), non sul computer di ognuno.

## ⚠️ Leggi prima di usarlo

- **LinkedIn vedrà questo come un accesso da un nuovo dispositivo/luogo.** È molto probabile che, al primo
  utilizzo, LinkedIn chieda una verifica (email/SMS) o mostri un avviso di sicurezza sull'account — è un
  comportamento normale per un login "nuovo", non un errore del runner. Tienilo d'occhio nella tua casella
  email collegata a LinkedIn.
- **Il cookie `li_at` equivale ad essere loggato sul tuo account** e la password LinkedIn (se usi il login
  automatico invece del cookie manuale) è altrettanto sensibile. Chiunque li abbia può agire come te su
  LinkedIn. Se `CONNECTION_ENCRYPTION_KEY` è configurata sul server e usi Supabase, entrambi sono cifrati
  a riposo (AES-256-GCM, vedi `src/lib/crypto.ts`); in modalità locale a file (senza Supabase) restano in
  chiaro come il resto dei dati di sviluppo — trattali comunque come una password, non condividerli.
- **Stessa violazione dei Termini di Servizio di LinkedIn** dell'estensione — stesso rischio di
  restrizione/ban dell'account.
- **Selettori DOM non testati contro LinkedIn reale** (stessa situazione dell'estensione — vedi
  `extension/README.md` per come sistemarli, la logica è la stessa, cambia solo l'API usata — Playwright
  invece del DOM del browser). Questo vale anche per il login automatico descritto sotto: non è mai stato
  eseguito contro un account LinkedIn reale.
- **Testa prima su un account secondario**, con limiti bassi (i default in `/connections` sono 15
  connessioni/giorno, 80/settimana, 30 messaggi/giorno).
- **`chromium` non gira su Vercel**: è un processo Node persistente, va eseguito su un servizio che supporti
  processi always-on (Railway, Render, Fly.io, una piccola VPS...), non come funzione serverless. Vercel
  resta il backend/API; il runner è un deploy separato che ci parla via HTTP.

## Login automatico (email + password) vs. cookie manuale

Da `/connections` puoi collegare un profilo in due modi:

1. **Email + password (consigliato)**: il runner apre `linkedin.com/login`, inserisce le credenziali e
   invia il form. Se LinkedIn chiede un codice di verifica via email/SMS, l'app te lo mostra e il codice
   che inserisci viene passato al runner (che tiene la pagina aperta in attesa, fino a 10 minuti) per
   completare l'accesso. **Non può gestire un CAPTCHA o un'approvazione dall'app LinkedIn su un altro
   dispositivo** — in quei casi il tentativo fallisce con un messaggio che ti rimanda all'opzione manuale.
2. **Cookie manuale** (sempre disponibile come alternativa, vedi sotto): incolli tu il valore di `li_at`
   preso da un browser dove sei già loggato.

## Come trovare il cookie `li_at` (opzione manuale)

1. Vai su [linkedin.com](https://www.linkedin.com) già loggato con l'account da collegare
2. Apri DevTools (F12 o Cmd+Opt+I) → tab **Application** (Chrome) o **Storage** (Firefox)
3. Nel pannello a sinistra: Cookies → `https://www.linkedin.com`
4. Trova la riga `li_at` e copia il suo **Value**

Questo valore scade periodicamente (LinkedIn invalida le sessioni): se il runner smette di autenticarsi,
ripeti questi passaggi e aggiorna il cookie da `/connections` nell'app.

## Configurazione

```bash
cd runner
npm install                      # installa anche Chromium via `playwright install chromium` (postinstall)
cp .env.example .env
```

Modifica `runner/.env`:
- `REACHOS_BACKEND_URL` — URL pubblico di ReachOS (es. `https://tuo-progetto.vercel.app`)
- `RUNNER_MASTER_KEY` — una stringa segreta a tua scelta (es. generata con `openssl rand -base64 32`), che
  deve combaciare **esattamente** con `RUNNER_MASTER_KEY` impostata sul backend (Vercel → Environment
  Variables). È l'unica credenziale: dà al runner accesso a *tutte* le connessioni di *tutti* gli utenti,
  quindi trattala come una password d'amministratore, non va mai esposta lato client.

```bash
npm start
```

La prima volta, ti conviene mettere `REACHOS_HEADLESS=false` in `.env` per vedere il browser mentre lavora
e verificare che tutto funzioni come previsto.

## Dove farlo girare

### Opzione gratis: GitHub Actions programmato (consigliata per iniziare)

`.github/workflows/runner.yml` fa girare il runner **una passata sola** ogni 15 minuti (invece di un
processo sempre acceso) su un runner temporaneo di GitHub Actions — gratis entro i minuti inclusi nel piano
GitHub che hai già, nessun account nuovo da creare. Il compromesso: le connessioni vengono controllate ogni
~15 minuti invece che di continuo, ma per richieste di connessione/messaggi/controlli non è un problema (anzi,
un ritmo più umano è meglio per non farsi notare da LinkedIn).

Per attivarlo, su GitHub → questo repo → Settings → Secrets and variables → Actions → "New repository
secret", aggiungi:
- `REACHOS_BACKEND_URL` = l'URL pubblico dell'app (es. `https://tuo-progetto.vercel.app`)
- `RUNNER_MASTER_KEY` = la stessa chiave impostata su Vercel

Fatto: il workflow parte da solo secondo lo schedule. Puoi anche lanciarlo a mano da GitHub → tab "Actions" →
"ReachOS runner (scheduled)" → "Run workflow", utile per il primo test.

### Opzione a pagamento: processo sempre acceso

Se in futuro serve una latenza più bassa (controllo continuo invece che ogni 15 minuti), un servizio come
**Railway** o **Render** (~$5-7/mese) può far girare `npm start` come processo persistente invece del
workflow schedulato — stesso codice, stesse variabili d'ambiente, cambia solo come viene avviato:
collega il repo, imposta la root directory su `runner/`, build command `npm install`, start command
`npm start`.

## Come funziona

Ad ogni ciclo il runner chiama `GET /api/runner/connections` (autenticato con `RUNNER_MASTER_KEY`) per
ottenere l'elenco di **tutte** le connessioni esistenti, poi passa una per una: per ciascuna, controlla
prima se c'è un **login in attesa** (`/api/extension/next-login-job`) — in quel caso esegue quello e basta
per quella connessione in questo ciclo, dato che può restare bloccato fino a 10 minuti in attesa di un
codice di verifica. Altrimenti, stesso protocollo dell'estensione (`/api/extension/next-action`,
`/api/extension/report`), autenticato stavolta con il token della singola connessione (non la master key):
se c'è un'azione in coda apre una pagina Playwright sul profilo del lead, esegue l'azione
(`send_connection_request`, `check_acceptance`, `send_message`) e riporta l'esito. Un errore su una
connessione (cookie scaduto, selettore cambiato...) non blocca le altre: viene loggato e si passa alla
successiva. Il giro completo su tutte le connessioni si ripete ogni `REACHOS_POLL_INTERVAL_SECONDS`
(default 180s). La logica di pianificazione (quante azioni al giorno, quando ricontrollare l'accettazione,
quando mandare il follow-up) resta lato server in `src/lib/automation/scheduler.ts` — il runner esegue solo
quello che gli viene detto, un'azione alla volta per connessione.

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
