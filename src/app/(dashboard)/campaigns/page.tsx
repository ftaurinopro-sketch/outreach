import Link from "next/link";
import { listCampaigns } from "@/lib/campaigns/store";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Campaigns</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Collega una lista lead a un AI Assistant e definisci la sequenza di messaggi.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Nuova Campagna
        </Link>
      </div>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Le campagne restano in <strong>bozza</strong>: l&apos;invio reale su LinkedIn richiede il modulo
        Connections / motore di automazione, non ancora costruito.
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          Nessuna campagna ancora. Assicurati di avere almeno una lista lead (Lead Finder) e un AI Assistant
          prima di crearne una.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <Link href={`/campaigns/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                  {c.name}
                </Link>
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  {c.status}
                </span>
              </div>
              <span className="text-xs text-neutral-400">
                {new Date(c.createdAt).toLocaleDateString("it-IT")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
