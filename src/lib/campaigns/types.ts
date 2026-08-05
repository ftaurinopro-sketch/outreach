export type CampaignStatus = "draft" | "active" | "paused";

export const MAX_SEQUENCE_MESSAGES = 5;

// Fixed list, not free text: campaign language only feeds the AI
// suggest-message prompt and a display label, so a closed set is easier to
// get right than trusting free-form input to match what the AI expects.
export const CAMPAIGN_LANGUAGES = [
  "Italiano",
  "English",
  "Español",
  "Deutsch",
  "Français",
  "Português",
  "Nederlands",
] as const;
export type CampaignLanguage = (typeof CAMPAIGN_LANGUAGES)[number];

export type CampaignMessageStep = {
  id: string;
  text: string;
  // Days after the previous step was sent. Ignored for the first step,
  // which goes out as soon as the connection is accepted (still nudged
  // into the campaign's working hours/days).
  delayDays: number;
};

export type CampaignAutomationSettings = {
  // 0 = Sunday .. 6 = Saturday
  workingDays: number[];
  sendHourStart: number;
  sendHourEnd: number;
  randomDelayMinutes: number;
  // Optional per-campaign ceiling, tighter than (never looser than) the
  // connection's own daily/weekly limits — null means "use the
  // connection's limit".
  dailyConnectionCap: number | null;
  weeklyConnectionCap: number | null;
};

export const DEFAULT_AUTOMATION_SETTINGS: CampaignAutomationSettings = {
  workingDays: [1, 2, 3, 4, 5],
  sendHourStart: 9,
  sendHourEnd: 17,
  randomDelayMinutes: 15,
  dailyConnectionCap: null,
  weeklyConnectionCap: null,
};

export type CampaignInput = {
  name: string;
  leadListId: string;
  // Optional — a campaign can run on plain typed message templates without
  // an AI Assistant persona attached. Only needed for AI-driven features
  // (lead scoring against its ICP, sandbox testing, drafting a message
  // suggestion — the AI only ever proposes text, never sends anything).
  agentId: string | null;
  connectionNote: string;
  messages: CampaignMessageStep[];
  language: CampaignLanguage;
  automationSettings: CampaignAutomationSettings;
};

export type Campaign = CampaignInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CampaignStatus;
  connectionId: string | null;
  activatedAt: string | null;
};

// crypto.randomUUID() is a standard Web Crypto API, available in both the
// browser (this type is imported by client components like CampaignForm)
// and Node — unlike Node's "crypto" module import, which doesn't resolve
// the same way in the browser bundle.
export function newMessageStep(): CampaignMessageStep {
  return { id: crypto.randomUUID(), text: "", delayDays: 5 };
}

export const EMPTY_CAMPAIGN_INPUT: CampaignInput = {
  name: "",
  leadListId: "",
  agentId: null,
  connectionNote: "",
  messages: [{ id: "seed-1", text: "", delayDays: 5 }],
  language: "Italiano",
  automationSettings: DEFAULT_AUTOMATION_SETTINGS,
};
