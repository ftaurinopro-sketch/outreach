import Link from "next/link";
import { listLeadLists } from "@/lib/leads/store";
import { listScrapeJobs } from "@/lib/scrape-jobs/store";

const SOURCE_LABEL: Record<string, string> = {
  csv: "CSV",
  linkedin_basic_search: "LinkedIn Search",
  sales_navigator_search: "Sales Navigator",
  comment_scraper: "Comment Scraper",
};

const JOB_STATUS_LABEL: Record<string, string> = {
  pending: "In coda",
  in_progress: "In corso",
  failed: "Fallito",
};

export default async function LeadFinderPage() {
  const [lists, allJobs] = await Promise.all([listLeadLists(), listScrapeJobs()]);
  const pendingJobs = allJobs.filter((j) => j.status !== "done");

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Lead Finder</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Importa lead e salvali come liste riutilizzabili nelle campagne.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lead-finder/import-search"
            className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-900"
          >
            + Importa da ricerca
          </Link>
          <Link
            href="/lead-finder/import"
            className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Importa CSV
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/lead-finder/import-search"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:border-neutral-400"
        >
          <div className="font-medium text-neutral-900">Basic LinkedIn Search</div>
          <p className="mt-1 text-neutral-500">Incolla l&apos;URL di una ricerca LinkedIn normale.</p>
        </Link>
        <Link
          href="/lead-finder/import-search"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:border-neutral-400"
        >
          <div className="font-medium text-neutral-900">Sales Navigator Search</div>
          <p className="mt-1 text-neutral-500">Incolla l&apos;URL di una ricerca Sales Navigator.</p>
        </Link>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-400">
          <div className="font-medium text-neutral-500">Comment Scraper</div>
          <p className="mt-1">Non ancora costruito.</p>
        </div>
      </div>

      {pendingJobs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-900">Ricerche in corso</h2>
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {pendingJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">{job.listName}</span>
                  <span className="ml-2 text-neutral-400">
                    {SOURCE_LABEL[job.sourceType]} · {JOB_STATUS_LABEL[job.status]}
                  </span>
                  {job.error && <div className="mt-0.5 text-xs text-red-600">{job.error}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-neutral-900">Le tue liste</h2>
        {lists.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
            Nessuna lista ancora. Importa un CSV o una ricerca per iniziare.
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
                    {SOURCE_LABEL[list.sourceType]} · {list.leadCount} lead
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(list.createdAt).toLocaleDateString("it-IT")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
