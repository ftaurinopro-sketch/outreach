-- Denormalize the remaining Lead fields onto automation_actions, same
-- reasoning as the existing lead_first_name/lead_last_name/lead_company
-- columns: message personalization ({{jobTitle}}/{{location}}/{{industry}}/
-- {{customField}}) needs to work for follow-up steps queued after
-- acceptance, which only have this action snapshot to work from, not the
-- original Lead record in the lead list.

alter table automation_actions add column if not exists lead_position text not null default '';
alter table automation_actions add column if not exists lead_location text not null default '';
alter table automation_actions add column if not exists lead_industry text not null default '';
alter table automation_actions add column if not exists lead_custom_field text not null default '';
