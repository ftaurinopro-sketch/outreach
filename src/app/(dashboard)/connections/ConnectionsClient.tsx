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
  const [newConnection, setNewConnection] = useState<{ id: string; label: string; token: string } | null>(
    null
  );
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
      setNewConnection({ id: connection.id, label: connection.label, token: connection.token });
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
      {newConnection && (
        <SetupPanel connection={newConnection} onDone={() => setNewConnection(null)} onSaved={() => router.refresh()} />
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
            <ConnectionRow key={c.id} connection={c} onDelete={() => handleDelete(c.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConnectionRow({
  connection,
  onDelete,
}: {
  connection: ConnectionWithStatus;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [editingCookie, setEditingCookie] = useState(false);
  const [cookieValue, setCookieValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveCookie() {
    if (!cookieValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/connections/${connection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie: cookieValue.trim() }),
      });
      setEditingCookie(false);
      setCookieValue("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connection.online ? "bg-green-500" : "bg-neutral-300"}`} />
            <span className="font-medium text-neutral-900">{connection.label}</span>
            <span className="text-xs text-neutral-400">{connection.online ? "online" : "offline"}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                connection.sessionCookie ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {connection.sessionCookie ? "cookie configurato" : "cookie mancante"}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">
            {connection.dailyConnectionLimit}/giorno · {connection.weeklyConnectionLimit}/settimana connessioni ·{" "}
            {connection.dailyMessageLimit}/giorno messaggi
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingCookie((v) => !v)}
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            {connection.sessionCookie ? "Aggiorna cookie" : "Aggiungi cookie"}
          </button>
          <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
            Elimina
          </button>
        </div>
      </div>

      {editingCookie && (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Cookie di sessione (li_at)</label>
          <input
            value={cookieValue}
            onChange={(e) => setCookieValue(e.target.value)}
            placeholder="Incolla qui il valore del cookie li_at"
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono text-xs"
          />
          <button
            onClick={saveCookie}
            disabled={saving || !cookieValue.trim()}
            className="mt-2 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva cookie"}
          </button>
        </div>
      )}
    </li>
  );
}

function SetupPanel({
  connection,
  onDone,
  onSaved,
}: {
  connection: { id: string; label: string; token: string };
  onDone: () => void;
  onSaved: () => void;
}) {
  const [cookieValue, setCookieValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveCookie() {
    if (!cookieValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/connections/${connection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie: cookieValue.trim() }),
      });
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-50 p-5">
      <h3 className="text-sm font-medium text-neutral-900">
        Connessione &quot;{connection.label}&quot; creata — configura il runner
      </h3>

      <div className="mt-3">
        <p className="text-xs text-neutral-500">
          1. <strong>Token</strong> (mostrato una sola volta) — va in <code className="font-mono">runner/.env</code>{" "}
          come <code className="font-mono">REACHOS_TOKEN</code>:
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs">
            {connection.token}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(connection.token)}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-xs hover:border-neutral-900"
          >
            Copia
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-neutral-500">
          2. <strong>Cookie di sessione LinkedIn (li_at)</strong> — è come una password: chi lo ha può agire
          come te su LinkedIn. Per trovarlo: vai su linkedin.com già loggato → apri DevTools (F12) →
          Application (o Storage) → Cookies → linkedin.com → copia il valore del cookie{" "}
          <code className="font-mono">li_at</code>.
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={cookieValue}
            onChange={(e) => setCookieValue(e.target.value)}
            placeholder="Incolla qui il valore del cookie li_at"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
          <button
            onClick={saveCookie}
            disabled={saving || !cookieValue.trim()}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
        {saved && <p className="mt-1 text-xs text-green-700">Cookie salvato.</p>}
        <p className="mt-2 text-xs text-neutral-500">
          Puoi anche saltare questo passaggio ora e aggiungerlo dopo dalla lista connessioni qui sotto.
        </p>
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-neutral-500">
        <li>
          Nel repo: <code className="font-mono">cd runner && npm install && npx playwright install chromium</code>
        </li>
        <li>
          Copia <code className="font-mono">runner/.env.example</code> in{" "}
          <code className="font-mono">runner/.env</code> e imposta URL del sito + token.
        </li>
        <li>
          <code className="font-mono">npm start</code> — vedi <code className="font-mono">runner/README.md</code>{" "}
          per i dettagli e gli avvisi sul rischio.
        </li>
      </ol>

      <button onClick={onDone} className="mt-3 text-xs text-neutral-400 hover:text-neutral-700">
        Ho salvato tutto
      </button>
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
