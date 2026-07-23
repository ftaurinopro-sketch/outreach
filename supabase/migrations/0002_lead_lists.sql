-- Lead lists imported via the Lead Finder module.
-- source_type is currently always 'csv'; the other values are reserved for
-- when the LinkedIn/Sales Navigator search import and comment scraper ship
-- with the automation engine.

create table if not exists lead_lists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  source_type text not null check (
    source_type in ('csv', 'linkedin_basic_search', 'sales_navigator_search', 'comment_scraper')
  ),
  leads jsonb not null default '[]'::jsonb
);

create index if not exists lead_lists_created_at_idx on lead_lists (created_at desc);
