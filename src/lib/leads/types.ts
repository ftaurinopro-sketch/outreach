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
  // One arbitrary extra value per lead, carried through to message
  // personalization as {{customField}}/{{custom_field}} — a CSV import can
  // populate this via the optional "Custom Field" column. Not a generic
  // multi-field system; just the single field the product spec asks for.
  customField?: string;
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

export const CSV_COLUMNS = [
  "LinkedIn URL",
  "First Name",
  "Last Name",
  "Headline",
  "Location",
  "Company",
  "Position",
  "Industry",
  "Custom Field",
] as const;
