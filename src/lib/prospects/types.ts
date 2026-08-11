import type { FitCategory } from "@/lib/leads/types";

export { FIT_CATEGORIES, FIT_CATEGORY_COLOR } from "@/lib/leads/types";
export type { FitCategory };

export const PROSPECT_SOURCES = [
  "csv",
  "linkedin_basic_search",
  "sales_navigator_search",
  "manual",
  "comment_scraper",
] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

// A global, deduplicated (per user, by linkedinUrl) prospect directory —
// unlike src/lib/leads/types.ts's Lead, which only ever exists embedded
// inside one LeadList's jsonb array (so the same person imported twice
// becomes two disconnected records). This is the entity campaigns enroll
// via campaign_prospects; the legacy Lead/LeadList model keeps working
// unmodified for existing campaigns in the meantime.
export type Prospect = {
  id: string;
  createdAt: string;
  updatedAt: string;
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline: string;
  company: string;
  position: string;
  location: string;
  industry: string;
  email: string;
  notes: string;
  tags: string[];
  customFields: Record<string, string>;
  source: ProspectSource;
  score: number | null;
  fitCategory: FitCategory | null;
  seniority: string | null;
  signals: string | null;
  scoreReasoning: string | null;
  scoredAt: string | null;
  scoredByAgentId: string | null;
};

export type ProspectInput = {
  linkedinUrl: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  company?: string;
  position?: string;
  location?: string;
  industry?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  source: ProspectSource;
};

export const EMPTY_PROSPECT_INPUT: ProspectInput = {
  linkedinUrl: "",
  firstName: "",
  lastName: "",
  company: "",
  position: "",
  location: "",
  source: "manual",
};
