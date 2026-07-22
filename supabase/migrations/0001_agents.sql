-- AI Assistants (agents) created via the guided wizard.
-- Run this once your Supabase project exists, then set NEXT_PUBLIC_SUPABASE_URL
-- and SUPABASE_SERVICE_ROLE_KEY in .env.local — the app switches from the
-- local JSON file store to Supabase automatically once those are set.

create extension if not exists pgcrypto;

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  config jsonb not null
);

create index if not exists agents_created_at_idx on agents (created_at desc);
