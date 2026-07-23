-- Automation action queue polled by the browser extension
-- (GET /api/extension/next-action, POST /api/extension/report).
-- Lifecycle per lead: send_connection_request -> check_acceptance
-- (rescheduled +24h up to MAX_ACCEPTANCE_CHECKS times if not yet accepted)
-- -> on acceptance, send_message (message1) [+ send_message follow-up,
-- scheduled but NOT reply-aware yet — see src/lib/automation/scheduler.ts].

create table if not exists automation_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null,
  connection_id uuid not null,
  lead_linkedin_url text not null,
  lead_first_name text not null default '',
  lead_last_name text not null default '',
  lead_company text not null default '',
  type text not null check (type in ('send_connection_request', 'check_acceptance', 'send_message')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'failed', 'expired')),
  scheduled_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  check_count integer not null default 0
);

create index if not exists automation_actions_poll_idx
  on automation_actions (connection_id, status, scheduled_at);
create index if not exists automation_actions_campaign_idx
  on automation_actions (campaign_id);
