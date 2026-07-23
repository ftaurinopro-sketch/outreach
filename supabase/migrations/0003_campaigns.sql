-- Campaigns: link a lead list + an AI Assistant to a message sequence.
-- status starts 'draft' and becomes 'active' once a Connection (linked
-- LinkedIn profile, see 0004_connections.sql) runs it via
-- POST /api/campaigns/[id]/activate, which also enqueues the
-- automation_actions (0005_automation_actions.sql).

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'active')),
  connection_id uuid,
  activated_at timestamptz,
  config jsonb not null
);

create index if not exists campaigns_created_at_idx on campaigns (created_at desc);
