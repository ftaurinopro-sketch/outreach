-- Adds reply detection: a "check_reply" action runs shortly before each
-- follow-up message; if the lead already replied, the rest of that lead's
-- sequence in that campaign is stopped (see cancelPendingMessagesForLead in
-- src/lib/automation/store.ts) rather than sending a canned follow-up on
-- top of a live conversation.

alter table automation_actions drop constraint if exists automation_actions_type_check;
alter table automation_actions add constraint automation_actions_type_check
  check (type in ('send_connection_request', 'check_acceptance', 'send_message', 'check_reply'));

alter table automation_actions drop constraint if exists automation_actions_status_check;
alter table automation_actions add constraint automation_actions_status_check
  check (status in ('pending', 'in_progress', 'done', 'failed', 'expired', 'cancelled'));
