"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentConfig, AgentInput } from "@/lib/agents/types";

const FIELDS: { key: keyof AgentInput; label: string; multiline?: boolean }[] = [
  { key: "name", label: "Nome agent" },
  { key: "companyName", label: "Azienda / prodotto" },
  { key: "valueProp", label: "Value proposition", multiline: true },
  { key: "differentiation", label: "Differenziazione", multiline: true },
  { key: "icp", label: "Cliente ideale (ICP)", multiline: true },
  { key: "tone", label: "Tono" },
  { key: "goal", label: "Obiettivo conversazione" },
  { key: "calendarLink", label: "Link calendario" },
  { key: "objections", label: "Gestione obiezioni", multiline: true },
  { key: "guardrails", label: "Cosa non deve mai fare/dire", multiline: true },
];

export default function AgentEditForm({ agent }: { agent: AgentConfig }) {
  const router = useRouter();
  const [values, setValues] = useState<AgentInput>({
    name: agent.name,
    companyName: agent.companyName,
    valueProp: agent.valueProp,
    differentiation: agent.differentiation,
    icp: agent.icp,
    tone: agent.tone,
    goal: agent.goal,
    calendarLink: agent.calendarLink,
    objections: agent.objections,
    guardrails: agent.guardrails,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare l'agent "${agent.name}"? L'azione non è reversibile.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      router.push("/ai-assistants");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{field.label}</label>
          {field.multiline ? (
            <textarea
              value={values[field.key]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          ) : (
            <input
              value={values[field.key]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>
          {savedAt && <span className="text-xs text-neutral-400">Salvato</span>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? "Eliminazione..." : "Elimina agent"}
        </button>
      </div>
    </div>
  );
}
