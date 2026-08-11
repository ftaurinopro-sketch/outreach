-- Sequence-engine architecture: a generic, data-driven step model replacing
-- the fixed 2-phase (connect, then <=5 hardcoded messages) pipeline, plus a
-- global deduplicated prospect directory replacing the per-list jsonb blobs
-- in lead_lists. Built ADDITIVELY alongside the existing schema — nothing
-- here touches agents/lead_lists/campaigns(config)/automation_actions, so
-- the current campaign flow keeps working unmodified while the new one is
-- built and proven. Campaigns move over once the new engine is solid; old
-- campaigns simply never get sequence_steps/campaign_prospects rows and
-- keep running through the legacy scheduler.

-- prospects: global per-user directory, deduplicated by LinkedIn URL. A CSV
-- row or a scraped search result upserts here instead of being trapped
-- inside one lead_lists.leads jsonb array — the same person imported twice
-- becomes one row, not two disconnected copies.
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  linkedin_url text not null,
  first_name text not null default '',
  last_name text not null default '',
  headline text not null default '',
  company text not null default '',
  position text not null default '',
  location text not null default '',
  industry text not null default '',
  email text not null default '',
  notes text not null default '',
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}'::jsonb,
  source text not null default 'manual'
    check (source in ('csv', 'linkedin_basic_search', 'sales_navigator_search', 'manual', 'comment_scraper')),
  -- AI scoring (src/lib/leads/scoring.ts today writes this onto the
  -- list-embedded Lead; the prospect-level equivalent lives here so a
  -- dedup'd prospect carries one score, not a different one per list).
  score integer,
  fit_category text check (fit_category in ('perfect_fit', 'strong_fit', 'possible_fit', 'weak_fit', 'no_fit')),
  seniority text,
  signals text,
  score_reasoning text,
  scored_at timestamptz,
  scored_by_agent_id uuid references agents (id) on delete set null,
  unique (user_id, linkedin_url)
);

alter table prospects enable row level security;
drop policy if exists "prospects_all_own" on prospects;
create policy "prospects_all_own" on prospects for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists prospects_user_id_idx on prospects (user_id);
create index if not exists prospects_linkedin_url_idx on prospects (linkedin_url);

-- sequence_steps: an ordered, typed list of actions belonging to a campaign
-- — this is the generic replacement for campaigns.config.messages (a flat
-- array of {id,text,delayDays} with the action types hardcoded everywhere
-- else in the app). action_type is deliberately a CHECK list rather than a
-- free column so invalid values fail fast, but every place that interprets
-- it (the execution engine, the runner) should treat it as a registry, not
-- a switch statement with no default case.
create table if not exists sequence_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null,
  action_type text not null check (action_type in (
    'view_profile',
    'send_connection_request',
    'send_message',
    'like_recent_post',
    'follow_profile',
    'manual_linkedin_action'
  )),
  execution_mode text not null default 'automatic' check (execution_mode in ('automatic', 'manual')),
  -- How long to wait after the previous step (or after activation, for
  -- position 0) before this step becomes due. A separate "wait" action type
  -- was deliberately not added — every actionable step just carries its own
  -- lead-in delay, matching how the product spec describes steps ("Each
  -- step should have: action type, delay, execution mode...").
  delay_minutes integer not null default 0,
  message_template text,
  ai_prompt text,
  -- { waitFor?: 'connection_accepted', ifReplied?: 'stop'|'continue',
  --   ifNoReply?: 'continue'|'stop', skipIfFailed?: boolean }
  -- Interpreted by the execution engine, not by any single UI component —
  -- see src/lib/sequences/types.ts for the typed shape.
  conditions jsonb not null default '{}'::jsonb,
  unique (campaign_id, position)
);

alter table sequence_steps enable row level security;
drop policy if exists "sequence_steps_all_own" on sequence_steps;
create policy "sequence_steps_all_own" on sequence_steps for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists sequence_steps_campaign_idx on sequence_steps (campaign_id, position);

-- campaign_prospects: one row per prospect enrolled in a campaign — this IS
-- the prospect state machine that was previously only ever inferred (three
-- separate, inconsistent ways) from automation_actions rows. UNIQUE
-- (campaign_id, prospect_id) is also the enforcement point for "don't
-- silently double-enroll the same prospect in the same campaign"; overlap
-- *across* different campaigns is a query the app runs before insert (see
-- src/lib/campaignProspects/store.ts), not a DB constraint, since a
-- prospect legitimately finishing one campaign before starting another is
-- allowed — only *simultaneous* active enrollment should warn.
create table if not exists campaign_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  prospect_id uuid not null references prospects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'new' check (status in (
    'new',
    'queued',
    'in_progress',
    'waiting',
    'connection_sent',
    'connected',
    'messaged',
    'replied',
    'completed',
    'paused',
    'failed',
    'opted_out'
  )),
  current_step_position integer not null default 0,
  next_action text,
  next_execution_at timestamptz,
  last_action_at timestamptz,
  stopped_reason text,
  added_at timestamptz not null default now(),
  unique (campaign_id, prospect_id)
);

alter table campaign_prospects enable row level security;
drop policy if exists "campaign_prospects_all_own" on campaign_prospects;
create policy "campaign_prospects_all_own" on campaign_prospects for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists campaign_prospects_campaign_idx on campaign_prospects (campaign_id, status);
create index if not exists campaign_prospects_prospect_idx on campaign_prospects (prospect_id);
create index if not exists campaign_prospects_due_idx on campaign_prospects (next_execution_at)
  where next_execution_at is not null;

-- activity_events: the step-agnostic execution log/queue, generalizing
-- automation_actions (which stays untouched and keeps serving old
-- campaigns). Same trust boundary as automation_actions/scrape_jobs: RLS
-- enabled with NO policies below, so only the service-role client can read
-- or write it — the runner authenticates via its own bearer token, not a
-- Supabase session, and user-facing routes that expose this data (e.g. an
-- activity-log endpoint) must first verify campaign ownership through the
-- RLS-protected campaigns table, the same pattern already used by
-- GET /api/campaigns/[id]/actions for automation_actions.
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  prospect_id uuid not null references prospects (id) on delete cascade,
  campaign_prospect_id uuid not null references campaign_prospects (id) on delete cascade,
  step_id uuid references sequence_steps (id) on delete set null,
  account_id uuid references connections (id) on delete set null,
  user_id uuid references auth.users (id) on delete cascade,
  action_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done', 'failed', 'expired', 'cancelled')),
  scheduled_at timestamptz not null default now(),
  executed_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  attempts integer not null default 0
);

alter table activity_events enable row level security;

create index if not exists activity_events_poll_idx on activity_events (account_id, status, scheduled_at);
create index if not exists activity_events_campaign_idx on activity_events (campaign_id);
create index if not exists activity_events_campaign_prospect_idx on activity_events (campaign_prospect_id);
create index if not exists activity_events_user_id_idx on activity_events (user_id);

-- Campaign status: widen to add completed/archived (previously only
-- draft/active/paused). Additive/backward-compatible — existing rows keep
-- whatever status they already have.
alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns add constraint campaigns_status_check
  check (status in ('draft', 'active', 'paused', 'completed', 'archived'));

-- LinkedIn account (connections table) lifecycle: today the only way to
-- stop a connection being used is to delete it outright. Add a status so an
-- account can be paused/disabled without losing its saved session/history.
alter table connections add column if not exists status text not null default 'active'
  check (status in ('active', 'paused', 'disabled'));
