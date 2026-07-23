-- Connections: a LinkedIn account, driven by the cloud runner (see
-- runner/) via a saved session cookie (li_at) — the runner authenticates a
-- headless browser as if it were "another device" logging in, no browser
-- extension required. token is the bearer credential the runner uses to
-- authenticate to /api/extension/*. Both token and session_cookie grant
-- meaningful access (API access, LinkedIn account access respectively):
-- treat them like passwords, never log them.

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null,
  token text not null unique,
  session_cookie text,
  daily_connection_limit integer not null default 15,
  weekly_connection_limit integer not null default 80,
  daily_message_limit integer not null default 30,
  last_seen_at timestamptz
);

create index if not exists connections_token_idx on connections (token);
