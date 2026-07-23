# ReachOS — Estensione Chrome (motore di automazione LinkedIn)

Questa estensione esegue le azioni delle campagne ReachOS (richiesta di connessione, verifica
accettazione, invio messaggi) direttamente nel tuo Chrome, mentre sei loggato su linkedin.com — è così che
funzionano tutti i tool di questo tipo (Waalaxy, Expandi, HeyReach, Conversifi...): non c'è un'API ufficiale
LinkedIn per queste azioni.

## ⚠️ Leggi prima di attivare qualsiasi campagna

- **Viola i Termini di Servizio di LinkedIn.** Il rischio pratico è la restrizione o il ban dell'account,
  temporaneo o permanente — non un'azione legale, ma comunque un rischio reale.
- **I selettori DOM in `content-script.js` non sono stati testati contro un LinkedIn reale** (sono stati
  scritti senza accesso a un account LinkedIn live). È molto probabile che qualcosa vada aggiornato prima
  che funzioni in modo affidabile — vedi "Come aggiustare un selettore rotto" più sotto.
- **Testa prima su un account secondario**, non sul tuo profilo LinkedIn principale, finché non sei sicuro
  che tutto funzioni come previsto.
- **Parti da limiti bassi** (i default sono 15 connessioni/giorno, 80/settimana, 30 messaggi/giorno — più
  conservativi dei 150-180/settimana che il piano di prodotto indica come tetto ragionevole per un account
  maturo) e alzali gradualmente solo dopo aver verificato che non ci sono blocchi/avvisi da parte di
  LinkedIn.

## Installazione

1. Apri `chrome://extensions`
2. Attiva "Modalità sviluppatore" (in alto a destra)
3. "Carica non pacchettizzata" → seleziona questa cartella (`extension/`)
4. Apri il popup dell'estensione (icona nella barra), inserisci:
   - **URL del sito ReachOS** (es. `http://localhost:3213` in locale, o il tuo URL Vercel)
   - **Token connessione**, generato dalla pagina `/connections` di ReachOS (visibile una sola volta al
     momento della creazione)
5. Assicurati di essere loggato su linkedin.com nello stesso profilo Chrome

## Come funziona

- `background.js` fa polling ogni 3 minuti su `/api/extension/next-action` (endpoint autenticato col token).
- Se c'è un'azione in coda, apre/riusa una tab LinkedIn e manda un messaggio a `content-script.js`, che
  esegue l'azione vera (clic su Connect, compilazione messaggio, ecc.) e risponde con l'esito.
- `background.js` riporta l'esito a `/api/extension/report`, che decide il passo successivo (es. dopo una
  richiesta di connessione, pianifica una verifica di accettazione 24h dopo).
- Il ritmo delle azioni (quante al giorno, spalmate su che orari) è deciso lato server in
  `src/lib/automation/scheduler.ts`, in base ai limiti impostati per la connessione — l'estensione esegue
  solo quello che le viene detto, un'azione alla volta.

## Come aggiustare un selettore rotto

Se un'azione fallisce con un errore tipo "bottone non trovato":

1. Apri manualmente la pagina LinkedIn coinvolta (profilo di un lead, o una chat)
2. Apri DevTools (F12) → tab "Elements"
3. Clicca l'icona "ispeziona elemento" e clicca sul bottone in questione (es. "Connect")
4. Guarda il testo, `aria-label`, o le classi CSS che lo identificano
5. Aggiorna la funzione corrispondente in `content-script.js` (es. `sendConnectionRequest`,
   `checkAcceptance`, `sendMessage`) con il selettore corretto
6. Ricarica l'estensione da `chrome://extensions` (icona di refresh sulla card dell'estensione)

## Limiti noti di questa prima versione

- Il follow-up viene inviato allo scadere dei giorni configurati **indipendentemente dal fatto che il lead
  abbia risposto o meno** — non c'è ancora rilevamento delle risposte (richiederebbe leggere il thread di
  messaggistica, non ancora implementato).
- Nessun comportamento di "engagement" (view profile / like / commento AI prima di connettersi) — è nel
  piano di prodotto (§1.2) ma non ancora costruito qui.
- Un'unica tab/sessione Chrome per connessione: se chiudi Chrome, il polling si ferma finché non lo riapri.
