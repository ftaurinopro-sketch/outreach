"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { AgentConfig } from "@/lib/agents/types";
import {
  EMPTY_CAMPAIGN_INPUT,
  MAX_SEQUENCE_MESSAGES,
  newMessageStep,
  type CampaignAutomationSettings,
  type CampaignInput,
} from "@/lib/campaigns/types";
import type { LeadListSummary } from "@/lib/leads/types";

const WEEKDAYS = [
  { value: 1, key: "mon" },
  { value: 2, key: "tue" },
  { value: 3, key: "wed" },
  { value: 4, key: "thu" },
  { value: 5, key: "fri" },
  { value: 6, key: "sat" },
  { value: 0, key: "sun" },
] as const;

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
    messages: [newMessageStep()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setSettings<K extends keyof CampaignAutomationSettings>(key: K, value: CampaignAutomationSettings[K]) {
    setValues((v) => ({ ...v, automationSettings: { ...v.automationSettings, [key]: value } }));
  }

  function updateMessage(index: number, patch: Partial<CampaignInput["messages"][number]>) {
    setValues((v) => ({
      ...v,
      messages: v.messages.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function addMessage() {
    if (values.messages.length >= MAX_SEQUENCE_MESSAGES) return;
    setValues((v) => ({ ...v, messages: [...v.messages, newMessageStep()] }));
  }

  function removeMessage(index: number) {
    if (values.messages.length <= 1) return;
    setValues((v) => ({ ...v, messages: v.messages.filter((_, i) => i !== index) }));
  }

  function toggleWorkingDay(day: number) {
    setValues((v) => {
      const days = v.automationSettings.workingDays.includes(day)
        ? v.automationSettings.workingDays.filter((d) => d !== day)
        : [...v.automationSettings.workingDays, day];
      return { ...v, automationSettings: { ...v.automationSettings, workingDays: days } };
    });
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("campaignName")}</label>
        <input
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("campaignNamePlaceholder")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
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
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-500">{t("messageSequence")}</label>
          <button
            type="button"
            onClick={addMessage}
            disabled={values.messages.length >= MAX_SEQUENCE_MESSAGES}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addMessage")}
          </button>
        </div>
        <div className="space-y-3">
          {values.messages.map((step, i) => (
            <div key={step.id} className="rounded-md border border-neutral-200 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">
                  {i === 0 ? t("firstMessageLabel") : t("messageLabel", { index: i + 1 })}
                </span>
                {values.messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMessage(i)}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  required={i === 0}
                  value={step.text}
                  onChange={(e) => updateMessage(i, { text: e.target.value })}
                  rows={i === 0 ? 3 : 2}
                  placeholder={i === 0 ? t("message1Placeholder") : t("followUpPlaceholder")}
                  className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
                {i > 0 && (
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-xs text-neutral-400">{t("afterDays")}</label>
                    <input
                      type="number"
                      min={1}
                      value={step.delayDays}
                      onChange={(e) => updateMessage(i, { delayDays: Number(e.target.value) || 1 })}
                      className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
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
                ? "border-indigo-600 bg-neutral-50"
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
                ? "border-indigo-600 bg-neutral-50"
                : "border-neutral-300 text-neutral-500"
            }`}
          >
            <div className="font-medium text-neutral-900">{t("fullyAutonomous")}</div>
            <div className="text-xs text-neutral-400">{t("repliesSentAutomatically")}</div>
          </button>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 p-3">
        <div className="mb-2 text-xs font-medium text-neutral-500">{t("automationSettings")}</div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-neutral-400">{t("workingDays")}</label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(({ value, key }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleWorkingDay(value)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  values.automationSettings.workingDays.includes(value)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {t(`weekday.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">{t("sendHourStart")}</label>
            <input
              type="number"
              min={0}
              max={23}
              value={values.automationSettings.sendHourStart}
              onChange={(e) => setSettings("sendHourStart", Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">{t("sendHourEnd")}</label>
            <input
              type="number"
              min={1}
              max={24}
              value={values.automationSettings.sendHourEnd}
              onChange={(e) => setSettings("sendHourEnd", Number(e.target.value) || 1)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">{t("randomDelay")}</label>
            <input
              type="number"
              min={0}
              value={values.automationSettings.randomDelayMinutes}
              onChange={(e) => setSettings("randomDelayMinutes", Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">{t("dailyCap")}</label>
            <input
              type="number"
              min={1}
              placeholder={t("useAccountLimit")}
              value={values.automationSettings.dailyConnectionCap ?? ""}
              onChange={(e) => setSettings("dailyConnectionCap", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">{t("weeklyCap")}</label>
            <input
              type="number"
              min={1}
              placeholder={t("useAccountLimit")}
              value={values.automationSettings.weeklyConnectionCap ?? ""}
              onChange={(e) => setSettings("weeklyConnectionCap", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? t("creating") : t("createCampaign")}
      </button>
    </form>
  );
}
