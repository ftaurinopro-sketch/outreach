-- Every RLS policy added in 0007 filters on `auth.uid() = user_id`, and the
-- admin detail page (added since) filters explicitly on user_id too — every
-- query against these tables was a full table scan for lack of an index.

create index if not exists agents_user_id_idx on agents (user_id);
create index if not exists lead_lists_user_id_idx on lead_lists (user_id);
create index if not exists campaigns_user_id_idx on campaigns (user_id);
create index if not exists connections_user_id_idx on connections (user_id);
create index if not exists automation_actions_user_id_idx on automation_actions (user_id);
create index if not exists scrape_jobs_user_id_idx on scrape_jobs (user_id);
