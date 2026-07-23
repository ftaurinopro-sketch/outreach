-- Campaigns: link a lead list + an AI Assistant to a message sequence.
-- MVP scope only (see piano_piattaforma_outreach_linkedin.md §6): fixed
-- sequence (connection note -> message 1 -> one follow-up), no intensity
-- presets, no engagement behaviors (like/comment) yet, single channel
-- (LinkedIn) implied. status is always 'draft' until the automation engine
-- (Connections module) exists to actually run a campaign.

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft')),
  config jsonb not null
);

create index if not exists campaigns_created_at_idx on campaigns (created_at desc);
