-- Superseded by a generic multi-custom-field system: a lead can now carry
-- any number of arbitrary CSV columns (src/lib/leads/csv.ts), not just one
-- fixed "Custom Field" column, so the single lead_custom_field text column
-- from migration 0015 becomes a jsonb map instead. No real data depends on
-- the old column yet (this feature only just shipped), so it's a plain
-- drop-and-add rather than a backfill.

alter table automation_actions drop column if exists lead_custom_field;
alter table automation_actions add column if not exists lead_custom_fields jsonb not null default '{}'::jsonb;
