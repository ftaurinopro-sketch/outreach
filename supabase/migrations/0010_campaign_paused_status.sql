-- Campaigns gained a "paused" status (real pause/resume, not just a UI
-- label — see pauseCampaign/resumeCampaign in src/lib/campaigns/store.ts
-- and claimNextAction in src/lib/automation/store.ts, which skips queued
-- actions for paused campaigns) but the original check constraint from
-- 0003_campaigns.sql was never widened to allow it. Without this, pausing a
-- campaign on a Supabase-backed deployment fails with a constraint
-- violation.

alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns add constraint campaigns_status_check
  check (status in ('draft', 'active', 'paused'));
