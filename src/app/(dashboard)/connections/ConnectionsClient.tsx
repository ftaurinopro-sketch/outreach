"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Connection } from "@/lib/connections/types";
import { DEFAULT_CONNECTION_LIMITS } from "@/lib/connections/types";

type ConnectionWithStatus = Connection & { online: boolean };

export default function ConnectionsClient({
  initialConnections,
}: {
  initialConnections: ConnectionWithStatus[];
}) {
  const router = useRouter();
  const [connections, setConnections] = useState(initialConnections);
  const [showForm, setShowForm] = useState(connections.length === 0);
  const [label, setLabel] = useState("");
  const [limits, setLimits] = useState(DEFAULT_CONNECTION_LIMITS);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<{ label: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...limits, label }),
      });
      if (!res.ok) throw new Error("Errore nella creazione");
      const { connection } = await res.json();
      setConnections((prev) => [{ ...connection, online: false }, ...prev]);
      setNewToken({ label: connection.label, token: connection.token });
      setShowForm(false);
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa connessione? Le campagne collegate resteranno attive ma senza esecutore.")) return;
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {newToken && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-50 p-5">
          <h3 className="text-sm font-medium text-neutral-900">
            Connessione &quot;{newToken.label}&quot; creata — configura l&apos;estensione
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Questo token viene mostrato una sola volta. Copialo e incollalo nel popup dell&apos;estensione
            Chrome (icona ReachOS → Impostazioni), insieme all&apos;indirizzo di questo sito.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs">
              {newToken.token}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newToken.token)}
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-xs hover:border-neutral-900"
            >
              Copia
            </button>
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-neutral-500">
            <li>
              Carica l&apos;estensione da <code className="font-mono">extension/</code> in Chrome (
              chrome://extensions → Modalità sviluppatore → Carica non pacchettizzata).
            </li>
            <li>Apri il popup dell&apos;estensione, incolla questo token e l&apos;URL di questo sito.</li>
            <li>Assicurati di essere loggato su linkedin.com nello stesso Chrome.</li>
          </ol>
          <button
            onClick={() => setNewToken(null)}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-700"
          >
            Ho salvato il token
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-900">Le tue connessioni</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Nuova connessione
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Etichetta</label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Es. Il mio profilo LinkedIn"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Connessioni/giorno"
              value={limits.dailyConnectionLimit}
              onChange={(v) => setLimits((l) => ({ ...l, dailyConnectionLimit: v }))}
            />
            <NumberField
              label="Connessioni/settimana"
              value={limits.weeklyConnectionLimit}
              onChange={(v) => setLimits((l) => ({ ...l, weeklyConnectionLimit: v }))}
            />
            <NumberField
              label="Messaggi/giorno"
              value={limits.dailyMessageLimit}
              onChange={(v) => setLimits((l) => ({ ...l, dailyMessageLimit: v }))}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {creating ? "Creazione..." : "Crea connessione"}
            </button>
            {connections.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900"
              >
                Annulla
              </button>
            )}
          </div>
        </form>
      )}

      {connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          Nessuna connessione ancora.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${c.online ? "bg-green-500" : "bg-neutral-300"}`}
                  />
                  <span className="font-medium text-neutral-900">{c.label}</span>
                  <span className="text-xs text-neutral-400">{c.online ? "online" : "offline"}</span>
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {c.dailyConnectionLimit}/giorno · {c.weeklyConnectionLimit}/settimana connessioni ·{" "}
                  {c.dailyMessageLimit}/giorno messaggi
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:underline">
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label}</label>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
        className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
      />
    </div>
  );
}
