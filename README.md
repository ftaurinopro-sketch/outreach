# ReachOS

Piattaforma di outreach multi-canale (LinkedIn, Facebook, Instagram, WhatsApp, Email) con AI agent builder,
modellata su Conversifi. Nome provvisorio: rinominabile in qualsiasi momento.

Il piano di prodotto completo (mappa funzionale, architettura, canali, roadmap, rischi) è in
`piano_piattaforma_outreach_linkedin.md` (fuori da questo repo, condiviso in chat).

## Stato attuale

Primo modulo costruito: **AI Assistant Builder + Sandbox**.

- `/ai-assistants` — lista degli agent creati
- `/ai-assistants/new` — wizard guidato in stile chat per creare un agent (azienda, value proposition,
  differenziazione, ICP, tono, obiettivo, link calendario, obiezioni, guardrail)
- `/ai-assistants/[id]` — dettaglio/modifica di un agent
- `/sandbox` — chat di test: simuli un prospect finto e vedi come risponde l'agent (usa Claude via
  Anthropic API)

Le altre voci di sidebar (`Campaigns`, `Lead Finder`, `Inbox`, `Connections`, `Reports`) sono placeholder —
prossimi moduli della roadmap.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Poi in `.env.local`:

- `ANTHROPIC_API_KEY` — necessaria per far funzionare la Sandbox (senza, l'app parte comunque ma la Sandbox
  mostra un avviso e non può chattare)
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — opzionali in locale: finché non sono
  impostate, gli agent vengono salvati in `.data/agents.json` (zero setup). Quando crei il progetto
  Supabase, esegui `supabase/migrations/0001_agents.sql` e imposta queste due variabili per passare al
  backend definitivo, senza toccare il codice.

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + TypeScript + Tailwind v4, Supabase (Postgres) come backend previsto, Claude
(`@anthropic-ai/sdk`) come motore degli AI Assistant.
