// Centralized variable resolution — the single place message templates get
// prospect data substituted in, for both static templates and (eventually)
// AI-generated drafts. Both {{firstName}} and {{first_name}} are accepted
// so a template written either way resolves correctly, matching the
// convention already established in the legacy scheduler
// (src/lib/automation/scheduler.ts personalize()).
export type PersonalizationSource = {
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  location: string;
  industry: string;
  customFields?: Record<string, string>;
};

export function resolveTemplate(template: string, source: PersonalizationSource): string {
  const replacements: [string, string, string][] = [
    ["firstName", "first_name", source.firstName],
    ["lastName", "last_name", source.lastName],
    ["company", "company", source.company],
    ["jobTitle", "job_title", source.position],
    ["position", "position", source.position],
    ["location", "location", source.location],
    ["industry", "industry", source.industry],
  ];
  const withFixedFields = replacements.reduce(
    (text, [camel, snake, value]) => text.replaceAll(`{{${camel}}}`, value).replaceAll(`{{${snake}}}`, value),
    template
  );
  return withFixedFields.replace(/\{\{custom_field:([^}]+)\}\}/g, (_match, key: string) => {
    return source.customFields?.[key.trim()] ?? "";
  });
}
