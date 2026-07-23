import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { listLeadLists } from "@/lib/leads/store";
import { listScrapeJobs } from "@/lib/scrape-jobs/store";
import { getCurrentUserId } from "@/lib/supabase/user";

export default async function LeadFinderPage() {
  const userId = await getCurrentUserId();
  const [lists, allJobs, t, locale] = await Promise.all([
    listLeadLists(),
    listScrapeJobs(userId),
    getTranslations("LeadFinder"),
    getLocale(),
  ]);
  const pendingJobs = allJobs.filter((j) => j.status !== "done");

  const sourceLabel: Record<string, string> = {
    csv: t("source.csv"),
    linkedin_basic_search: t("source.linkedinBasicSearch"),
    sales_navigator_search: t("source.salesNavigatorSearch"),
    comment_scraper: t("source.commentScraper"),
  };
  const jobStatusLabel: Record<string, string> = {
    pending: t("jobStatus.pending"),
    in_progress: t("jobStatus.inProgress"),
    failed: t("jobStatus.failed"),
  };

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lead-finder/import-search"
            className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-900"
          >
            {t("importFromSearch")}
          </Link>
          <Link
            href="/lead-finder/import"
            className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {t("importCsv")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/lead-finder/import-search"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:border-neutral-400"
        >
          <div className="font-medium text-neutral-900">{t("basicSearchTitle")}</div>
          <p className="mt-1 text-neutral-500">{t("basicSearchDescription")}</p>
        </Link>
        <Link
          href="/lead-finder/import-search"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:border-neutral-400"
        >
          <div className="font-medium text-neutral-900">{t("salesNavigatorTitle")}</div>
          <p className="mt-1 text-neutral-500">{t("salesNavigatorDescription")}</p>
        </Link>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-400">
          <div className="font-medium text-neutral-500">{t("commentScraperTitle")}</div>
          <p className="mt-1">{t("notBuiltYet")}</p>
        </div>
      </div>

      {pendingJobs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-900">{t("searchesInProgress")}</h2>
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {pendingJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">{job.listName}</span>
                  <span className="ml-2 text-neutral-400">
                    {sourceLabel[job.sourceType]} · {jobStatusLabel[job.status]}
                  </span>
                  {job.error && <div className="mt-0.5 text-xs text-red-600">{job.error}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-neutral-900">{t("yourLists")}</h2>
        {lists.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
            {t("empty")}
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {lists.map((list) => (
              <li key={list.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <Link href={`/lead-finder/${list.id}`} className="font-medium text-neutral-900 hover:underline">
                    {list.name}
                  </Link>
                  <span className="ml-2 text-neutral-400">
                    {sourceLabel[list.sourceType]} · {list.leadCount} {t("leadsCount")}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(list.createdAt).toLocaleDateString(locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
