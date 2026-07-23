"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Connection } from "@/lib/connections/types";
import { detectSourceType } from "@/lib/scrape-jobs/types";

const SOURCE_LABEL = {
  linkedin_basic_search: "Basic LinkedIn Search",
  sales_navigator_search: "Sales Navigator Search",
};

export default function SearchImportClient({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [searchUrl, setSearchUrl] = useState("");
  const [listName, setListName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectedType = useMemo(() => (searchUrl.trim() ? detectSourceType(searchUrl.trim()) : null), [searchUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, listName, searchUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore nella creazione del job");
      }
      router.push("/lead-finder");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Profilo LinkedIn (runner)</label>
        <select
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">URL della ricerca</label>
        <input
          required
          value={searchUrl}
          onChange={(e) => setSearchUrl(e.target.value)}
          placeholder="https://www.linkedin.com/search/results/people/?... oppure https://www.linkedin.com/sales/search/people?..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {detectedType && (
          <span className="mt-1.5 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            Rilevato: {SOURCE_LABEL[detectedType]}
          </span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Nome della lista</label>
        <input
          required
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="Es. Marketing CEOs USA"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <p className="text-xs text-neutral-400">
        Il job parte in coda ed è eseguito dal runner al prossimo ciclo di polling (di norma entro pochi
        minuti) — vedi lo stato in Lead Finder. Estrae i risultati della prima pagina.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Avvio..." : "Avvia ricerca"}
      </button>
    </form>
  );
}
