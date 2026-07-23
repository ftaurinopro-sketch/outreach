"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AgentConfig, AgentInput } from "@/lib/agents/types";

const FIELD_KEYS: { key: keyof AgentInput; multiline?: boolean }[] = [
  { key: "name" },
  { key: "companyName" },
  { key: "language" },
  { key: "objective" },
  { key: "valueProp", multiline: true },
  { key: "products", multiline: true },
  { key: "differentiation", multiline: true },
  { key: "icp", multiline: true },
  { key: "tone" },
  { key: "goal" },
  { key: "calendarLink" },
  { key: "objections", multiline: true },
  { key: "guardrails", multiline: true },
];

export default function AgentEditForm({ agent }: { agent: AgentConfig }) {
  const router = useRouter();
  const t = useTranslations("AgentEditForm");
  const [values, setValues] = useState<AgentInput>({
    name: agent.name,
    companyName: agent.companyName,
    language: agent.language,
    objective: agent.objective,
    valueProp: agent.valueProp,
    products: agent.products,
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
      if (!res.ok) throw new Error(t("saveError"));
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("deleteConfirm", { name: agent.name }))) return;
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
      {FIELD_KEYS.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            {t(`fields.${field.key}`)}
          </label>
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
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {savedAt && <span className="text-xs text-neutral-400">{t("saved")}</span>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? t("deleting") : t("deleteAgent")}
        </button>
      </div>
    </div>
  );
}
