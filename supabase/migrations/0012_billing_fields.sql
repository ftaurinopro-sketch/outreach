-- Trial + single-plan subscription tracking on profiles. Stripe isn't wired
-- up yet (stripe_customer_id/stripe_subscription_id sit unused until then)
-- — for now subscription_status is only ever changed manually by a
-- superadmin from /admin/users, or defaults from the trial.

alter table profiles add column if not exists trial_ends_at timestamptz;
alter table profiles add column if not exists subscription_status text not null default 'trialing';
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;

alter table profiles drop constraint if exists profiles_subscription_status_check;
alter table profiles add constraint profiles_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'expired', 'canceled'));

-- New users get a 14-day trial from signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, trial_ends_at) values (new.id, now() + interval '14 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing profiles created before this column existed, so they
-- don't read as "trial_ends_at is null" (which the app treats as unlimited)
-- forever by accident.
update profiles set trial_ends_at = created_at + interval '14 days' where trial_ends_at is null;
