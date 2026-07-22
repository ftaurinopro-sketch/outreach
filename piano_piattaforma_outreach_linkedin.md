# Piano: Piattaforma di Outreach Multi-Canale (LinkedIn, Facebook, Instagram, WhatsApp, Email) con Agent AI

## 0. Cosa ho studiato

Ho analizzato i 4 video che mi hai mandato, tutti relativi a **Conversifi** (conversifi.io), un tool di
LinkedIn outreach automation. Ho navigato dentro i video (screenshot della UI reale + sottotitoli) e ho
mappato tutte le funzionalità principali:

1. **"How to find LinkedIn leads with Conversifi"** — modulo Lead Finder (4 modalità di import lead)
2. **"Creating Your LinkedIn Outreach Campaign"** — creazione campagna, sequence builder, comportamento di engagement
3. **"Creating Your AI LinkedIn outreach assistant"** — wizard guidato per creare un AI agent + Sandbox di test
4. **"New Conversifi Update: Review AI Messages Before Sending"** — coda di approvazione messaggi AI

Nota terminologica: "sesta mi chiedo" / "sesto navigator" nel tuo messaggio = **Sales Navigator** (il
prodotto premium di LinkedIn), confermato anche dalla UI vista nei video ("Sales Navigator: Available",
ricerche filtrate con Sales Navigator, InMail/email via Sales Navigator).

---

## 1. Mappa funzionale della piattaforma di riferimento

### 1.1 Lead Finder
Pagina con 4 modalità, selezionabili come "Search Type":
- **Basic LinkedIn Search** — incolli l'URL di una ricerca LinkedIn normale (1st/2nd/3rd connections, filtri standard)
- **Sales Navigator Search** — incolli l'URL di una ricerca Sales Navigator (richiede Sales Navigator Core, filtri avanzati: industry, seniority, azienda, "actively hiring", ecc.)
- **Comment Scraper** — incolli l'URL di un post pubblico e importa chi ha commentato (richiede Sales Navigator Core)
- **Import CSV** — template scaricabile con colonne: `LinkedIn URL, First Name, Last Name, Headline, Location, Company, Position, Industry`

Flusso: vai su LinkedIn → fai la ricerca → copi l'URL dalla barra indirizzi → incolli in Conversifi → il
sistema **auto-rileva il tipo di ricerca** dall'URL → dai un nome alla ricerca → "Start Search" → i lead
vengono salvati come lista nominata, riutilizzabile in più campagne. C'è anche "AI Lead Scoring": prioritizza
i lead Sales Navigator per probabilità di conversione, usando il profilo dell'AI assistant come riferimento.

### 1.2 Campaigns (creazione campagna)
Wizard a step:
1. **Select Leads** — scegli una o più "prospect sources" (liste di lead salvate) + ordinamento (Default / Relevancy score)
2. **Configure Messages** — "Message Timeline":
   - Messaggio 1 inviato "al momento ottimale dopo l'accettazione della connessione"
   - Messaggi 2, 3... con regola "invia N giorni dopo l'ultimo messaggio se non c'è risposta"
   - "Choose an approach" (stile di copy, preset): **Direct Approach** (diretto, value-focused), **Pattern Interruption** (rompe lo schema, attira attenzione), **Relationship Building** (costruisce rapport nel tempo)
   - Pulsante "Generate Messages" (AI genera la sequenza)
   - Tag di personalizzazione cliccabili: `[First Name] [Last Name] [Location] [Current Position] [Company]`
3. **AI Assistant + Reply mode**:
   - Toggle "Use AI Assistant" → seleziona quale agent usare per questa campagna
   - Reply mode: **Fully Autonomous** (risposte inviate automaticamente, consigliato per velocità) vs **Review Before Sending** (l'AI prepara la bozza, tu approvi/modifichi/rifiuti prima dell'invio — è l'oggetto del video 4)
4. **Campaign Intensity**: Conservative (3 msg/14gg), Standard (4 msg/21gg), Aggressive (6 msg/30gg), Custom (timeline libera)
5. **Timezone** — i messaggi partono nelle ore di punta del fuso scelto
6. **Extra Settings → Connection Behavior** (azioni pre/con la richiesta di connessione):
   - View profile before connecting (visita il profilo prima, simula comportamento umano)
   - Like recent post before connecting (mette like all'ultimo post → **questa è la feature che hai descritto tu**)
   - AI comment on recent post before connecting: l'AI genera un commento personalizzato, con "comment prompt" configurabile (tono: Casual & Friendly / Thoughtful & curious / Short & punchy / Industry insider) + anteprima del commento generato
   - Add a note to connection request
7. **Blacklist**: aziende da escludere, profili LinkedIn da escludere
8. **Limiti di sicurezza**: la piattaforma consiglia 150–180 richieste di connessione/settimana, lasciando margine per richieste manuali — è un guardrail anti-ban di LinkedIn

Dashboard campagna: grafico andamento, Acceptance Rate %, Response Rate %, contatori "New / Accepted".

### 1.3 AI Assistants (creazione guidata dell'agent)
**Wizard conversazionale in chat**, non un form statico — è l'AI stessa che fa le domande una alla volta e
costruisce il profilo dell'agent dalle tue risposte (con barra di progresso %):
- "Qual è il nome della tua azienda?"
- "Cosa rende il tuo approccio diverso dagli altri sul mercato / perché ti scelgono?" (value proposition, differenziazione)
- "Che tono deve usare il tuo assistant?" (con chip rapidi: es. *Casual*)
- "Qual è il link del calendario per prenotare una call?" (Calendly / HubSpot / Acuity / Cal.com...) — quando l'AI capisce che il prospect è pronto, manda questo link direttamente
- (altri step probabili non ripresi nel frame ma coerenti col pattern: ICP/target, obiezioni comuni, pricing/offerta)

Il messaggio chiave del prodotto: *"la maggior parte dei tool si ferma al primo messaggio, noi gestiamo
l'intera conversazione fino alla prenotazione della call"* — cioè l'agent non è solo generatore del primo
messaggio, ma gestisce botta-e-risposta, obiezioni, e chiude prenotando la call.

Puoi creare **più assistant**, ognuno associabile a una campagna diversa — esattamente l'idea che hai avuto tu di "un agent per use case".

### 1.4 Sandbox (test dell'agent prima di andare live)
- Imposti un "prospect finto" di test: First Name, Last Name, Company, Job Title, Location (+ "Randomize")
- Opzionale: messaggio di apertura dell'AI da simulare
- Chat live dove tu scrivi "come se fossi il prospect" e vedi come risponde l'agent (limite giornaliero es. 25 messaggi/giorno, per contenere i costi LLM)
- Esempio visto: l'agent gestisce l'obiezione, propone la call, e quando il prospect finto accetta manda il link Calendly — comportamento reale end-to-end.

### 1.5 Altri moduli visti nella sidebar
- **Inbox** — conversazioni unificate di tutti i profili LinkedIn connessi, con probabile coda "da approvare" quando il reply mode è Review Before Sending
- **Connections** — gestione delle connessioni/relazioni
- **Profiles / Active Profile switcher** — supporto multi-profilo LinkedIn (utile se gestisci più account o è pensato anche per agenzie)
- **Reports** — analytics
- **Account Limits** — pannello che mostra quanto hai consumato dei limiti giornalieri/settimanali per profilo
- Ogni profilo mostra stato "Sales Navigator: Available/Not Available" e "Recruiter: Available/Not Available" — cioè la piattaforma rileva quali add-on LinkedIn hai attivi e sblocca le funzioni corrispondenti

---

## 2. Come funzionano *davvero* questi tool (nodo tecnico importante)

LinkedIn **non fornisce API pubbliche** per queste azioni (invio richieste di connessione, messaggi, like,
commenti automatici). Piattaforme come Conversifi, Waalaxy, Expandi, HeyReach, Aimfox ottengono questo in
due modi, spesso combinati:

1. **Estensione Chrome che gira nel tuo browser reale**, mentre sei loggato su LinkedIn normalmente. Le
   azioni (connect, like, message) vengono eseguite come script sulla pagina LinkedIn, quindi dal punto di
   vista di LinkedIn sembrano azioni umane fatte dal tuo browser/IP reale. È l'approccio più sicuro per
   evitare ban, ma richiede che tu abbia il browser aperto (o un servizio che tiene il tuo profilo "attivo").
2. **Automazione cloud headless** (Playwright/Puppeteer) che riusa i cookie di sessione del tuo account,
   spesso con un **proxy residenziale dedicato per account** (stesso IP/fingerprint ogni volta, per non
   sembrare un accesso anomalo), e con delay/randomizzazione tra le azioni per simulare un ritmo umano.

**Rischio**: questo tipo di automazione viola i Termini di Servizio di LinkedIn. Il rischio pratico è la
restrizione o il ban dell'account (temporaneo o permanente), non un'azione legale — è lo stesso rischio che
si assume chiunque usi Waalaxy/Expandi/Conversifi oggi. I guardrail che questi tool mettono (limiti
settimanali, "view profile before connecting", intensità configurabile, orari di invio) servono proprio a
minimizzare questo rischio. Nel piano sotto li trattiamo come requisiti, non come optional.

Per il *tuo* uso personale (un solo profilo, il tuo), l'approccio più semplice, economico e meno rischioso è
l'**estensione Chrome + servizio cloud leggero** che orchestra sequenze e AI, piuttosto che costruire da
subito un'infrastruttura multi-account con proxy dedicati (quello serve se in futuro vorrai rivenderla ad
altri come SaaS).

---

## 3. Architettura proposta

Coerente con lo stack che usi già per gli altri tuoi progetti (Next.js + Supabase + Vercel, free-tier friendly):

```
┌─────────────────────────────┐
│  Web App (Next.js su Vercel)│  ← dashboard: Lead Finder, Campaigns, Agent Builder, Sandbox, Inbox, Reports
└───────────────┬─────────────┘
                │ REST/RPC
┌───────────────▼─────────────┐
│  Supabase (Postgres + Auth  │  ← lead, campagne, agent config, conversazioni, log azioni, limiti/quote
│  + Storage + Edge Functions)│
└───────────────┬─────────────┘
                │ job queue (Supabase cron / Edge Functions o servizio esterno tipo Trigger.dev)
┌───────────────▼─────────────┐
│  Automation Engine           │  ← estensione Chrome (Manifest V3) collegata al tuo profilo LinkedIn
│  (extension + relay service) │     esegue: connect, like, comment, message, scrape ricerche
└───────────────┬─────────────┘
                │
┌───────────────▼─────────────┐
│  Agent Engine (LLM)          │  ← Claude (Sonnet/Haiku) per: generare messaggi, gestire conversazioni,
│  system prompt per agent     │     rilevare intent "vuole prenotare" → manda link calendario
└──────────────────────────────┘
```

**Componenti chiave:**
- **Estensione Chrome**: legge/scrive sul DOM di LinkedIn quando il profilo è loggato; comunica con il
  backend per ricevere "il prossimo lotto di azioni da fare" e riportare gli esiti (accettato/non accettato,
  nuovo messaggio ricevuto). È il pezzo più delicato da costruire (selettori DOM che LinkedIn cambia spesso).
- **Coda di azioni con rate limiter**: ogni azione (connect/like/comment/message) passa da una coda che
  rispetta i limiti configurati (es. max N connessioni/giorno, delay randomico tra azioni, finestra oraria).
- **Agent Engine**: ogni "AI Assistant" è in pratica un **system prompt + knowledge base** (azienda, value
  prop, tono, FAQ/obiezioni, link calendario) salvato su Supabase; quando arriva un messaggio nell'Inbox, il
  motore genera la risposta con quel contesto + storico conversazione, e la instrada verso invio automatico
  o coda di approvazione a seconda del reply mode.
- **Calendar detection**: quando l'agent rileva intenzione di prenotare, inserisce il link calendario nella
  risposta (semplice, non serve integrazione calendario reale in v1 — è quello che fa anche Conversifi).

---

## 4. Moduli prodotto da costruire (in ordine di dipendenza)

| # | Modulo | Cosa fa | Dipende da |
|---|--------|---------|------------|
| 1 | **Auth + Connessione LinkedIn** | login utente (Supabase Auth), collegamento del profilo LinkedIn tramite estensione, rilevamento stato Sales Navigator | — |
| 2 | **Lead Finder** | import lead da URL ricerca LinkedIn/Sales Navigator, comment scraper, CSV | Modulo 1 |
| 3 | **Agent Builder guidato** | wizard conversazionale per creare 1+ AI Assistant, ognuno con il proprio contesto/tono/obiettivo | — (indipendente, puoi costruirlo anche in parallelo) |
| 4 | **Sandbox** | testare un agent con un prospect finto prima di usarlo in una campagna reale | Modulo 3 |
| 5 | **Campaigns / Sequence builder** | creare sequenze (connect → wait → like/comment → message → follow-up), collegare un agent, impostare intensità/orari/blacklist | Moduli 2 + 3 |
| 6 | **Automation Engine (estensione)** | eseguire realmente le azioni su LinkedIn nel rispetto dei limiti | Modulo 5 |
| 7 | **Inbox + Review queue** | conversazioni unificate, coda di approvazione se reply mode = Review Before Sending | Moduli 5 + 6 |
| 8 | **Reports** | acceptance rate, response rate, meeting prenotati | Moduli 5–7 |

---

## 5. Focus: il modulo "Agent Builder" (il cuore della tua richiesta)

Tu hai indicato che questa è la parte più importante: creazione guidata di agent, con possibilità di crearne
più di uno per use case diverso (es. "Agent per prospect SaaS B2B", "Agent per recruiting", "Agent per
partnership"). Proposta di flow, ricalcando/estendendo quello visto nei video:

**Step del wizard (conversazionale, una domanda alla volta, con barra di progresso):**
1. Nome dell'agent / use case (es. "Outreach agenzie marketing")
2. Nome azienda / prodotto che rappresenta
3. Cosa fai / value proposition in una frase
4. Perché un prospect dovrebbe scegliere te (differenziazione, "perché noi e non i competitor")
5. ICP — chi è il target ideale (ruolo, settore, dimensione azienda) → questo può anche precompilare i filtri suggeriti nel Lead Finder
6. Tono di voce (chip rapidi: Casual / Professionale / Diretto / Consulenziale...)
7. Obiettivo finale della conversazione (prenotare call / raccogliere email / altro)
8. Link di prenotazione (Calendly ecc.)
9. Obiezioni comuni + come rispondere (opzionale, migliora molto la qualità delle risposte autonome)
10. Cosa NON deve fare/dire mai (guardrail, es. non parlare di prezzo, non promettere sconti)

Alla fine: riepilogo leggibile + possibilità di modificare ogni campo + **salva come agent riutilizzabile**.
Dietro le quinte questo genera un system prompt strutturato (JSON → prompt) usato sia in Sandbox sia nelle
campagne reali. La libreria di agent è quindi una tabella `agents` con questi campi, e ogni campagna
referenzia un `agent_id`.

**Perché conviene farlo conversazionale e non un form:** risposte più dettagliate → prompt migliore (lo dice
anche il video: *"più sei dettagliato nelle risposte, meglio l'agent performerà"*). Un form a caselle
incoraggia risposte brevi; una chat guidata con follow-up ("puoi dirmi di più su...?") no.

---

## 6. Roadmap a fasi

Coerente con come lavori di solito (un modulo alla volta, Definition of Done per ognuno, commit dopo ogni
milestone):

**MVP (uso personale, un solo profilo LinkedIn — tu):**
1. Auth + connessione LinkedIn (estensione base che legge lo stato di login)
2. Agent Builder guidato (anche solo 1 agent per iniziare) + Sandbox
3. Lead Finder — solo import CSV + Basic LinkedIn Search (rimandare Sales Navigator/Comment Scraper a v1)
4. Campaigns semplice — sequenza fissa (connect → messaggio 1 → follow-up), senza ancora "like/comment
   automatico" (quello è la parte più rischiosa lato ban, meglio validare il resto prima)
5. Automation Engine — estensione Chrome minimale che esegue connect + invio messaggi con rate limit fisso e conservativo
6. Inbox con Review Before Sending (parti sempre da qui, non da Fully Autonomous — più sicuro mentre testi)

**v1 (parità con Conversifi):**
- Sales Navigator Search + Comment Scraper nel Lead Finder
- Engagement pre-connessione: like/comment automatico con AI
- Campaign Intensity + Blacklist + gestione multi-timezone
- Reply mode Fully Autonomous
- Reports/analytics

**v2 (se vorrai aprirla ad altri, come hai accennato "per ogni use case che voglio proporre"):**
- Multi-profilo LinkedIn / multi-utente (se diventa un prodotto per altri, non solo per te)
- Proxy dedicati per profilo, infrastruttura anti-ban più robusta
- Libreria di template di agent per use case (recruiting, sales, partnership...)

---

## 7. Rischi da avere chiari prima di iniziare

- **Ban/restrizione dell'account LinkedIn**: è il rischio principale, non eliminabile del tutto. Si mitiga
  con limiti conservativi, comportamento umano-simile, e partendo da Review Before Sending.
  Consiglio: **non usare il tuo profilo LinkedIn "principale" per i primi test** finché il sistema non è
  stabile.
- **Manutenzione dei selettori DOM**: LinkedIn cambia periodicamente l'interfaccia, l'estensione andrà
  aggiornata di conseguenza — è un costo ricorrente, non un rischio one-off.
- **Costi LLM**: ogni messaggio generato/risposta ha un costo token; con Sandbox e reply autonomo va
  monitorato (Conversifi stessa mette un tetto giornaliero in Sandbox: 25 msg/giorno).
- **GDPR**: i dati dei lead (nome, azienda, ecc.) sono dati personali — se in futuro apri la piattaforma ad
  altri utenti, serve una policy privacy e base giuridica per il trattamento.

---

## 8. Estensione multi-canale: LinkedIn, Facebook, Instagram, WhatsApp, Email

Hai chiesto di poter collegare, oltre a LinkedIn, anche **Facebook**, **Instagram**, **WhatsApp** ed **Email**,
con lo stesso layout: colleghi l'account → carichi liste di lead → parti con "aggiungi contatto"/primo
messaggio + sequenza. Il principio di prodotto che hai fissato è: **rischi sempre espliciti, ma tutte le
opzioni sempre disponibili** — nessun canale/modalità viene nascosto o bloccato, la piattaforma informa e
lascia scegliere, per ogni campagna, canale per canale. Questo vale anche per LinkedIn stesso, non solo per
i canali aggiunti dopo.

### 8.1 Differenze reali tra i canali

| | LinkedIn | Facebook | Instagram | WhatsApp | Email |
|---|---|---|---|---|---|
| Concetto di "aggiungi contatto" | Connection request (nativo, tollerato se nei limiti) | Friend request a sconosciuti — **fortemente limitata da Meta** oltre una soglia | Non esiste "aggiunta": *Follow* poi *DM*, rilevamento anti-bot molto aggressivo | Non esiste: scrivi direttamente a un numero, nessuno stato "in attesa" | Non esiste: invii direttamente, è il canale storicamente più "abituato" al freddo (cold email B2B è pratica di mercato consolidata) |
| API/via ufficiale per contatto a freddo | Non esiste (tutto il settore usa automazione) | Non esiste: Messenger API scrive solo a chi ti ha scritto prima o arriva da ads | Stessa regola: solo conversazioni già aperte | Solo template pre-approvati verso chi ha dato consenso esplicito; libero entro 24h da un messaggio ricevuto | **Esiste ed è lo standard**: invio via SMTP/ESP (Gmail/Workspace API, Microsoft 365, Postmark/SES) è normale invio email, nessuna "automazione non ufficiale" richiesta |
| Cosa fa l'ecosistema di tool oggi | Settore consolidato (Waalaxy, Expandi, HeyReach, Conversifi...) | Pochi tool seri fanno friend-request bulk | Tool di growth automation in gran parte spariti dal 2019-2020 per ban di massa | Bulk sender esistono ma i numeri vengono banned rapidamente | Settore enorme e maturo (Instantly, Lemlist, Apollo, Smartlead, Woodpecker) — il cold email è il canale più "industrializzato" di tutti |
| Tipo di rischio | Ban/restrizione account (ToS) | Ban/restrizione account (ToS) | Ban/restrizione account (ToS), il più severo dei social | Ban del **numero di telefono** (ToS) + possibile rischio normativo (consenso preventivo richiesto da ePrivacy/GDPR, guidance specifica del Garante Privacy in Italia) | Non c'è "ban" di piattaforma in senso stretto: il rischio è **reputazione del dominio/mailbox** (finire in spam, blacklist) e **normativo/legale** — negli USA il CAN-SPAM Act ammette email commerciali non richieste con opt-out obbligatorio; in UE/Italia l'email B2B a indirizzi professionali rientra spesso nel "legittimo interesse" GDPR, ma va gestita con attenzione (opt-out immediato, no email B2C senza consenso) |
| Livello di rischio complessivo | Moderato | Alto | Molto alto | Molto alto + dimensione legale | Basso-moderato se fatto bene (dominio dedicato, warm-up, compliance); il rischio principale è "bruciare" la reputazione del dominio, non legale |

Nota: l'email è l'unico canale dove non serve automazione "non ufficiale" per fare outreach a freddo — è per
questo il più facile da costruire e il meno rischioso in assoluto, anche in modalità "aggressive". Il vero
tema lì è la **deliverability** (finire in inbox e non in spam), non il ban.

### 8.2 Architettura: Channel Adapter + Risk Mode

La UI e la logica di prodotto (Lead Finder, Campaign builder, Agent Builder, Sandbox, Inbox) restano
**identiche e channel-agnostic** per tutti e 5 i canali. Cambiano due cose sotto: l'adapter che esegue le
azioni, e una **modalità di rischio selezionabile per ogni canale/campagna**, come principio generale della
piattaforma — non solo per i canali "nuovi":

```
Campaign (channel: linkedin | facebook | instagram | whatsapp | email, risk_mode: safe | aggressive)
        │
        ▼
Channel Adapter (interfaccia comune: connect(lead), like(post), comment(post), sendMessage(lead, text))
        │
   ┌────┼────────────────┼────────────────┼──────────────┐
   ▼    ▼                ▼                ▼              ▼
LinkedIn  Facebook      Instagram        WhatsApp        Email
Adapter   Adapter       Adapter          Adapter         Adapter
(extension (extension    (extension       (Cloud API se   (SMTP/ESP
automation, automation +  automation +     safe; whatsapp- sempre — safe
2 profili di Messenger API  IG Messaging    web automation  = 1 dominio/
intensità:   se safe)       API se safe)    se aggressive)  volumi bassi,
safe/aggr.)                                                 aggressive =
                                                              multi-dominio/
                                                              multi-mailbox,
                                                              volumi alti)
```

Ogni adapter espone le stesse operazioni ma con backend/parametri diversi a seconda del `risk_mode`:
- **safe**: canali/API ufficiali dove esistono (Facebook, Instagram, WhatsApp), oppure parametri conservativi dove l'automazione è comunque necessaria (LinkedIn: intensità bassa, tutti i comportamenti "umani" attivi; Email: 1 solo dominio/mailbox, volumi bassi, piena compliance) — rischio minimo per costruzione.
- **aggressive**: automazione non ufficiale a volumi più alti (browser automation per LinkedIn/Facebook/Instagram, whatsapp-web per WhatsApp) o, per l'email, invio massivo multi-dominio/multi-mailbox in stile "cold email agency". Ogni canale ha i propri limiti di default per questa modalità, tarati sul suo rischio reale (quelli di LinkedIn in §1.2 sono i più permissivi; Facebook/Instagram/WhatsApp molto più bassi; Email può reggere volumi alti se la reputazione del dominio è protetta con un dominio dedicato).

**Nel prodotto**: la scelta `risk_mode` è sempre visibile e selezionabile per ogni canale fin dal primo
rilascio di quel canale — non è nascosta né sbloccata dopo. Quando si sceglie `aggressive` su un canale
diverso da LinkedIn/Email, la UI mostra il riepilogo del rischio (tabella §8.1, versione breve) e richiede
una conferma esplicita ("Ho capito il rischio e voglio procedere comunque") prima di attivare la campagna.
Rischio esplicito, opzione sempre disponibile: nessun blocco, solo trasparenza.

### 8.3 Cosa significa per la roadmap

- Lead Finder, Agent Builder e Sandbox **non cambiano**: un lead è un lead, un agent è un agent, indipendentemente da canale e risk mode.
- Il **Lead Finder per Facebook/Instagram/WhatsApp/Email** cambia solo la sorgente di import: niente "URL di ricerca" come su LinkedIn, quindi CSV (nome, username/numero/email, contesto) o liste di chi ha interagito con un tuo contenuto (dato ottenibile via API ufficiale dove esiste).
- Ordine di **costruzione** (diverso da "quali opzioni sono disponibili", che restano tutte previste da subito nel modello dati/UI):
  1. LinkedIn — è il canale su cui hai iniziato, guardrail già definiti in §1.2
  2. Email — a valore/rischio quasi identico a LinkedIn ma tecnicamente più semplice (nessuna estensione browser, solo API email), buon secondo canale
  3. Facebook + Instagram in modalità safe (richiede app Meta for Developers + review permessi)
  4. WhatsApp in modalità safe (richiede WhatsApp Business Account verificato)
  5. Modalità aggressive di Facebook, Instagram, WhatsApp — ultime, con warning come da §8.2

## 9. Prossimi passi

Come richiesto, parto subito con lo sviluppo invece di aspettare conferma su tutto:

- **Nome provvisorio del progetto: "ReachOS"** — l'ho scelto io per non bloccare l'avvio, coerente con la
  convenzione che usi altrove ("Stokely: AI OS for surf schools"). Si rinomina in qualunque momento (repo,
  package.json, ecc.) senza problemi: dimmi pure il nome definitivo quando vuoi.
- **Si parte dall'Agent Builder + Sandbox**, come da roadmap §6: è il modulo indipendente dai canali, non
  tocca automazione rischiosa, ed è quello che ti interessa di più.
- Resta aperta una cosa che non blocca l'avvio ma serve più avanti per il Lead Finder: **il tuo profilo
  LinkedIn ha Sales Navigator?**

Sviluppo in corso — dettagli tecnici (stack, struttura repo, cosa è stato implementato) nel messaggio di
avanzamento in chat.
