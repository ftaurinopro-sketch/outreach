-- Promotable superadmins, on top of the SUPERADMIN_EMAILS env var (which
-- stays a root override that always works even if a role gets edited
-- wrong — see src/lib/auth/superadmin.ts).

alter table profiles add column if not exists role text not null default 'user';

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user', 'superadmin'));
