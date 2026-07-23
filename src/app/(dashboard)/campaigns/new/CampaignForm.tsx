"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AgentConfig } from "@/lib/agents/types";
import { EMPTY_CAMPAIGN_INPUT, type CampaignInput } from "@/lib/campaigns/types";
import type { LeadListSummary } from "@/lib/leads/types";

export default function CampaignForm({
  agents,
  leadLists,
}: {
  agents: AgentConfig[];
  leadLists: LeadListSummary[];
}) {
  const router = useRouter();
  const t = useTranslations("CampaignForm");
  const [values, setValues] = useState<CampaignInput>({
    ...EMPTY_CAMPAIGN_INPUT,
    agentId: agents[0]?.id ?? "",
    leadListId: leadLists[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("createError"));
      }
      const { campaign } = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("campaignName")}</label>
        <input
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("campaignNamePlaceholder")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("leadList")}</label>
          <select
            value={values.leadListId}
            onChange={(e) => set("leadListId", e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
          >
            {leadLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.leadCount})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("aiAssistant")}</label>
          <select
            value={values.agentId}
            onChange={(e) => set("agentId", e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("connectionNote")}</label>
        <textarea
          value={values.connectionNote}
          onChange={(e) => set("connectionNote", e.target.value)}
          rows={2}
          placeholder={t("connectionNotePlaceholder")}
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("message1")}</label>
        <textarea
          required
          value={values.message1}
          onChange={(e) => set("message1", e.target.value)}
          rows={3}
          placeholder={t("message1Placeholder")}
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("followUp")}</label>
        <div className="flex gap-2">
          <textarea
            value={values.followUpMessage}
            onChange={(e) => set("followUpMessage", e.target.value)}
            rows={2}
            placeholder={t("followUpPlaceholder")}
            className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <div className="w-28 shrink-0">
            <label className="mb-1 block text-xs text-neutral-400">{t("afterDays")}</label>
            <input
              type="number"
              min={1}
              value={values.followUpDelayDays}
              onChange={(e) => set("followUpDelayDays", Number(e.target.value) || 1)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("replyMode")}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("replyMode", "review")}
            className={`flex-1 rounded-md border px-3 py-2 text-left text-sm ${
              values.replyMode === "review"
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-300 text-neutral-500"
            }`}
          >
            <div className="font-medium text-neutral-900">{t("reviewBeforeSending")}</div>
            <div className="text-xs text-neutral-400">{t("recommendedToStart")}</div>
          </button>
          <button
            type="button"
            onClick={() => set("replyMode", "autonomous")}
            className={`flex-1 rounded-md border px-3 py-2 text-left text-sm ${
              values.replyMode === "autonomous"
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-300 text-neutral-500"
            }`}
          >
            <div className="font-medium text-neutral-900">{t("fullyAutonomous")}</div>
            <div className="text-xs text-neutral-400">{t("repliesSentAutomatically")}</div>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? t("creating") : t("createCampaign")}
      </button>
    </form>
  );
}
