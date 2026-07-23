-- Scrape jobs: import leads from a LinkedIn/Sales Navigator search URL.
-- Polled by the runner (GET /api/extension/next-scrape-job) which uses the
-- connection's session cookie to open the search URL and scrape the result
-- cards, then reports back (POST /api/extension/report-scrape) with the
-- leads found, which become a new row in lead_lists.

create table if not exists scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  connection_id uuid not null,
  list_name text not null,
  search_url text not null,
  source_type text not null check (source_type in ('linkedin_basic_search', 'sales_navigator_search')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'failed')),
  result_list_id uuid,
  result_count integer,
  error text
);

create index if not exists scrape_jobs_poll_idx on scrape_jobs (connection_id, status, created_at);
