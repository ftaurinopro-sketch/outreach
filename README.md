# ReachOS

Piattaforma di outreach multi-canale (LinkedIn, Facebook, Instagram, WhatsApp, Email) con AI agent builder,
modellata su Conversifi. Nome provvisorio: rinominabile in qualsiasi momento.

Il piano di prodotto completo (mappa funzionale, architettura, canali, roadmap, rischi) è in
`piano_piattaforma_outreach_linkedin.md`.

## Stato attuale

Moduli costruiti (in ordine di dipendenza):

- **AI Assistant Builder** (`/ai-assistants`) — wizard guidato in stile chat per creare un agent (azienda,
  value proposition, differenziazione, ICP, tono, obiettivo, link calendario, obiezioni, guardrail)
- **Sandbox** (`/sandbox`) — chat di test: simuli un prospect finto e vedi come risponde l'agent (Claude via
  Anthropic API)
- **Lead Finder** (`/lead-finder`) — import lead da CSV, liste riutilizzabili nelle campagne (ricerca
  LinkedIn/Sales Navigator/comment scraper non ancora costruita, richiede l'automazione)
- **Campaigns** (`/campaigns`) — collega una lista lead + un AI Assistant a una sequenza fissa (nota di
  connessione → messaggio 1 → un follow-up), reply mode, si "attiva" collegando una Connection
- **Connections** (`/connections`) — collega un profilo LinkedIn: genera un token (per l'esecutore) e un
  cookie di sessione LinkedIn `li_at` (per autenticarsi su LinkedIn)
- **Motore di automazione** — coda di azioni + scheduler (`src/lib/automation/`) che l'esecutore consuma via
  `/api/extension/next-action` e `/api/extension/report`. Due esecutori disponibili, stesso protocollo:
  - `runner/` (**consigliato**) — script Node/Playwright che gira in cloud/locale, autentica un browser
    headless col cookie di sessione (come un login da un altro dispositivo), non serve tenere Chrome aperto
  - `extension/` — estensione Chrome che agisce nel tuo browser reale mentre sei loggato

`Inbox` e `Reports` sono ancora placeholder.

⚠️ Sia `runner/` che `extension/` eseguono azioni reali su LinkedIn e violano i suoi Termini di Servizio —
leggi i rispettivi README prima di collegare un account vero, e testa prima su un account secondario.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Poi in `.env.local`:

- `ANTHROPIC_API_KEY` — necessaria per far funzionare la Sandbox
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — opzionali in locale: finché non sono impostate,
  i dati vengono salvati in file locali sotto `.data/` (zero setup). Quando crei il progetto Supabase,
  esegui le migration in `supabase/migrations/` (in ordine) e imposta queste due variabili per passare al
  backend definitivo, senza toccare il codice.

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000). Per collegare davvero un account LinkedIn, vedi
`runner/README.md` (consigliato) o `extension/README.md`.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4, Supabase (Postgres) come backend previsto, Claude
(`@anthropic-ai/sdk`) come motore degli AI Assistant, Playwright (in `runner/`) per l'automazione LinkedIn
via cookie di sessione.
