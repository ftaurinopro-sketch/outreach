export type LeadSourceType =
  | "csv"
  | "linkedin_basic_search"
  | "sales_navigator_search"
  | "comment_scraper";

export type Lead = {
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  company: string;
  position: string;
  industry: string;
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
] as const;
