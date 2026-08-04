-- Audit trail for superadmin actions (currently just impersonation). No RLS
-- policies on purpose: only the service-role client (used by /api/admin/*
-- routes, which check isSuperadminEmail server-side before touching this
-- table) can read or write it — RLS with zero policies means deny-all for
-- every other client, same pattern as automation_actions/scrape_jobs.

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  actor_email text not null,
  action text not null,
  target_id uuid references auth.users (id) on delete set null,
  target_email text,
  created_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;
