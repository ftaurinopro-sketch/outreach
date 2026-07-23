-- Multi-tenancy: every "root" entity a logged-in user creates directly
-- (agents, lead_lists, campaigns, connections) gets a user_id, defaulting to
-- auth.uid() so the app code doesn't need to set it explicitly on insert —
-- RLS then enforces that a user only ever sees their own rows.
--
-- automation_actions and scrape_jobs are NOT gated by RLS here: they're
-- operational/child records reached either (a) from the browser only after
-- the owning campaign/connection has already been verified via the
-- user-scoped client (RLS on campaigns/connections already blocks
-- cross-tenant access at that point), or (b) from the extension/runner via
-- its own bearer token, which is a different trust boundary than a Supabase
-- session and has no auth.uid() to check against. They still get a user_id
-- column (set explicitly by the app) for querying/cleanup, just not RLS.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  onboarding_completed boolean not null default false
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created (covers
-- both email/password sign-up and Google OAuth first login).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- agents
alter table agents add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table agents enable row level security;
create policy "agents_all_own" on agents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- lead_lists
alter table lead_lists add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table lead_lists enable row level security;
create policy "lead_lists_all_own" on lead_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- campaigns
alter table campaigns add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table campaigns enable row level security;
create policy "campaigns_all_own" on campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- connections
alter table connections add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table connections enable row level security;
create policy "connections_all_own" on connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- automation_actions / scrape_jobs: user_id for bookkeeping, no default (set
-- explicitly by application code), no RLS policy (see note above) — but RLS
-- is still enabled with no policies, which means "deny all" for any client
-- that isn't the service-role key. This means only the admin client
-- (service role, used by /api/extension/* and the activate route) can ever
-- touch these tables, which is exactly the intended trust boundary.
alter table automation_actions add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table automation_actions enable row level security;

alter table scrape_jobs add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table scrape_jobs enable row level security;
