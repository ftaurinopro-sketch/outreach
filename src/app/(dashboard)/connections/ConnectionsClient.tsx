"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Connection } from "@/lib/connections/types";
import { DEFAULT_CONNECTION_LIMITS } from "@/lib/connections/types";
import ConnectionSetupPanel from "@/components/ConnectionSetupPanel";

type ConnectionWithStatus = Connection & { online: boolean };

export default function ConnectionsClient({
  initialConnections,
}: {
  initialConnections: ConnectionWithStatus[];
}) {
  const router = useRouter();
  const t = useTranslations("ConnectionsClient");
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
      if (!res.ok) throw new Error(t("createError"));
      const { connection } = await res.json();
      setConnections((prev) => [{ ...connection, online: false }, ...prev]);
      setNewConnection({ id: connection.id, label: connection.label, token: connection.token });
      setShowForm(false);
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {newConnection && (
        <ConnectionSetupPanel
          connection={newConnection}
          onDone={() => setNewConnection(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-900">{t("yourConnections")}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {t("newConnection")}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">{t("labelField")}</label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label={t("connectionsPerDay")}
              value={limits.dailyConnectionLimit}
              onChange={(v) => setLimits((l) => ({ ...l, dailyConnectionLimit: v }))}
            />
            <NumberField
              label={t("connectionsPerWeek")}
              value={limits.weeklyConnectionLimit}
              onChange={(v) => setLimits((l) => ({ ...l, weeklyConnectionLimit: v }))}
            />
            <NumberField
              label={t("messagesPerDay")}
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
              {creating ? t("creating") : t("createConnection")}
            </button>
            {connections.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      )}

      {connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          {t("empty")}
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
  const t = useTranslations("ConnectionsClient");
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
            <span className="text-xs text-neutral-400">{connection.online ? t("online") : t("offline")}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                connection.sessionCookie ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {connection.sessionCookie ? t("cookieConfigured") : t("cookieMissing")}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">
            {t("limitsSummary", {
              daily: connection.dailyConnectionLimit,
              weekly: connection.weeklyConnectionLimit,
              messages: connection.dailyMessageLimit,
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingCookie((v) => !v)}
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            {connection.sessionCookie ? t("updateCookie") : t("addCookie")}
          </button>
          <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
            {t("delete")}
          </button>
        </div>
      </div>

      {editingCookie && (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("sessionCookieLabel")}</label>
          <input
            value={cookieValue}
            onChange={(e) => setCookieValue(e.target.value)}
            placeholder={t("cookiePlaceholder")}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono text-xs"
          />
          <button
            onClick={saveCookie}
            disabled={saving || !cookieValue.trim()}
            className="mt-2 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveCookie")}
          </button>
        </div>
      )}
    </li>
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
