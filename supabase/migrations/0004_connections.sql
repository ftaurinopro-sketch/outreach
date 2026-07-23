-- Connections: a LinkedIn profile linked via the browser extension
-- (see extension/). token is the bearer credential the extension pastes
-- into its popup to authenticate to /api/extension/*. Treat it like a
-- password: it's shown once in the Connections UI, never logged.

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null,
  token text not null unique,
  daily_connection_limit integer not null default 15,
  weekly_connection_limit integer not null default 80,
  daily_message_limit integer not null default 30,
  last_seen_at timestamptz
);

create index if not exists connections_token_idx on connections (token);
