-- Automated LinkedIn login: an alternative to pasting the li_at session
-- cookie manually. The user enters their LinkedIn email/password once, the
-- cloud runner (see runner/) drives an actual login with Playwright and
-- reports back the resulting session cookie — same trust boundary as the
-- cookie itself, just automating the step that used to require DevTools.
--
-- Both session_cookie and linkedin_password_encrypted are encrypted at rest
-- by the app (src/lib/crypto.ts, AES-256-GCM) before ever reaching this
-- table — see src/lib/connections/store.ts.

alter table connections add column if not exists linkedin_email text;
alter table connections add column if not exists linkedin_password_encrypted text;

-- login_attempts: same "no RLS policy, admin-client-only" pattern as
-- automation_actions/scrape_jobs (see 0007_auth_and_tenancy.sql) — reached
-- both from a user-session route (after ownership of connection_id is
-- already verified via the RLS-checked connections table) and from the
-- extension/runner's bearer-token routes, which have no Supabase session.
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',
  verification_prompt text,
  verification_code text,
  error text
);

create index if not exists login_attempts_connection_idx on login_attempts (connection_id, status);

alter table login_attempts enable row level security;
