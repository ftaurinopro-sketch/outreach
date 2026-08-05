export type LeadSourceType =
  | "csv"
  | "linkedin_basic_search"
  | "sales_navigator_search"
  | "comment_scraper";

export type FitCategory = "perfect_fit" | "strong_fit" | "possible_fit" | "weak_fit" | "no_fit";

export const FIT_CATEGORIES: FitCategory[] = [
  "perfect_fit",
  "strong_fit",
  "possible_fit",
  "weak_fit",
  "no_fit",
];

// Order matches the fit tiers from best to worst, used for default sorting
// after scoring and for the badge color scale.
export const FIT_CATEGORY_COLOR: Record<FitCategory, string> = {
  perfect_fit: "bg-green-100 text-green-800",
  strong_fit: "bg-emerald-100 text-emerald-700",
  possible_fit: "bg-amber-100 text-amber-800",
  weak_fit: "bg-orange-100 text-orange-800",
  no_fit: "bg-red-100 text-red-700",
};

export type Lead = {
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  company: string;
  position: string;
  industry: string;
  // Any CSV column that isn't one of the recognized fields above becomes a
  // custom field here, keyed by its (trimmed) header text — e.g. a "Deal
  // Size" column becomes customFields["Deal Size"]. Referenced in messages
  // as {{custom_field:Deal Size}}, substituted at send time
  // (src/lib/automation/scheduler.ts personalize()).
  customFields?: Record<string, string>;
  // AI scoring (src/lib/leads/scoring.ts) — absent until the list has been
  // analyzed at least once.
  score?: number;
  fitCategory?: FitCategory;
  seniority?: string;
  signals?: string;
  scoreReasoning?: string;
  scoredAt?: string;
  scoredByAgentId?: string;
};

export type LeadList = {
  id: string;
  createdAt: string;
  name: string;
  sourceType: LeadSourceType;
  leads: Lead[];
};

export type LeadListSummary = Omit<LeadList, "leads"> & { leadCount: number };

// The recognized columns — any other column in the CSV is captured as a
// custom field instead of being ignored (see Lead.customFields above).
export const CSV_COLUMNS = [
  "LinkedIn URL",
  "First Name",
  "Last Name",
  "Headline",
  "Location",
  "Company",
  "Position",
  "Industry",
] as const;
