export type ScrapeSourceType = "linkedin_basic_search" | "sales_navigator_search";
export type ScrapeJobStatus = "pending" | "in_progress" | "done" | "failed";

export type ScrapeJob = {
  id: string;
  createdAt: string;
  connectionId: string;
  listName: string;
  searchUrl: string;
  sourceType: ScrapeSourceType;
  status: ScrapeJobStatus;
  resultListId: string | null;
  resultCount: number | null;
  error: string | null;
};

export function detectSourceType(url: string): ScrapeSourceType {
  return url.includes("/sales/") ? "sales_navigator_search" : "linkedin_basic_search";
}
