"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { AgentConfig } from "@/lib/agents/types";
import type { Prospect } from "@/lib/prospects/types";
import { CAMPAIGN_LANGUAGES, type CampaignLanguage } from "@/lib/campaigns/types";
import {
  SEQUENCE_ACTION_TYPES,
  EXECUTION_MODES,
  IMPLEMENTED_ACTION_TYPES,
  newSequenceStepInput,
  type SequenceStepInput,
  type SequenceActionType,
  type ExecutionMode,
} from "@/lib/sequences/types";
import type { CampaignProspectOverlap } from "@/lib/campaignProspects/types";

type DelayUnit = "minutes" | "hours" | "days";

function delayToMinutes(value: number, unit: DelayUnit): number {
  if (unit === "hours") return value * 60;
  if (unit === "days") return value * 60 * 24;
  return value;
}

export default function NewSequenceCampaignForm({
  agents,
  prospects,
}: {
  agents: AgentConfig[];
  prospects: Prospect[];
}) {
  const router = useRouter();
  const t = useTranslations("NewSequenceCampaign");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [language, setLanguage] = useState<CampaignLanguage>("Italiano");
  const [steps, setSteps] = useState<SequenceStepInput[]>([
    newSequenceStepInput("send_connection_request"),
  ]);
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());
  const [prospectSearch, setProspectSearch] = useState("");
  const [overlaps, setOverlaps] = useState<CampaignProspectOverlap[]>([]);
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProspects = useMemo(() => {
    const kw = prospectSearch.trim().toLowerCase();
    if (!kw) return prospects;
    return prospects.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.company} ${p.headline}`.toLowerCase().includes(kw)
    );
  }, [prospects, prospectSearch]);

  function addStep() {
    setSteps((s) => [...s, newSequenceStepInput("send_message")]);
  }

  function updateStep(index: number, patch: Partial<SequenceStepInput>) {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function removeStep(index: number) {
    setSteps((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== index)));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((s) => {
      const target = index + direction;
      if (target < 0 || target >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function toggleProspect(id: string) {
    setSelectedProspectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitProspects(campaignId: string, force: boolean) {
    const res = await fetch(`/api/campaigns/${campaignId}/prospects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: Array.from(selectedProspectIds), force }),
    });
    if (!res.ok) throw new Error(t("createError"));
    return (await res.json()) as { overlaps: CampaignProspectOverlap[] };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Resume after an overlap warning: the campaign/sequence were already
      // created on the first submit, this second one just force-enrolls.
      if (pendingCampaignId) {
        await submitProspects(pendingCampaignId, true);
        router.push("/campaigns");
        return;
      }

      const campaignRes = await fetch("/api/campaigns/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, agentId: agentId || null, language }),
      });
      if (!campaignRes.ok) {
        const data = await campaignRes.json().catch(() => ({}));
        throw new Error(data.error || t("createError"));
      }
      const { campaign } = await campaignRes.json();

      const sequenceRes = await fetch(`/api/campaigns/${campaign.id}/sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (!sequenceRes.ok) {
        const data = await sequenceRes.json().catch(() => ({}));
        throw new Error(data.error || t("createError"));
      }

      if (selectedProspectIds.size > 0) {
        const { overlaps: found } = await submitProspects(campaign.id, false);
        if (found.length > 0) {
          setOverlaps(found);
          setPendingCampaignId(campaign.id);
          return;
        }
      }

      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  if (overlaps.length > 0 && pendingCampaignId) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-medium text-amber-900">{t("overlapTitle")}</h2>
        <ul className="space-y-1 text-sm text-amber-800">
          {overlaps.map((o) => (
            <li key={`${o.prospectId}-${o.campaignId}`}>
              {t("overlapItem", { campaign: o.campaignName, status: o.status })}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? t("creating") : t("addAnyway")}
          </button>
          <button
            onClick={() => {
              setOverlaps([]);
              setPendingCampaignId(null);
            }}
            className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900"
          >
            {t("skipOverlapping")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("campaignName")}</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("campaignNamePlaceholder")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("descriptionLabel")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("aiAssistant")}</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
          >
            <option value="">{t("noAiAssistant")}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("language")}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as CampaignLanguage)}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
          >
            {CAMPAIGN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-500">{t("sequence")}</label>
          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addStep")}
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <SequenceStepEditor
              key={i}
              step={step}
              index={i}
              total={steps.length}
              onChange={(patch) => updateStep(i, patch)}
              onRemove={() => removeStep(i)}
              onMove={(dir) => moveStep(i, dir)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-500">
            {t("prospectsLabel", { count: selectedProspectIds.size })}
          </label>
          <input
            value={prospectSearch}
            onChange={(e) => setProspectSearch(e.target.value)}
            placeholder={t("searchProspects")}
            className="w-48 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200">
          {filteredProspects.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-sm last:border-b-0 hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={selectedProspectIds.has(p.id)}
                onChange={() => toggleProspect(p.id)}
              />
              <span className="font-medium text-neutral-900">
                {p.firstName} {p.lastName}
              </span>
              <span className="text-xs text-neutral-400">{p.company}</span>
            </label>
          ))}
          {filteredProspects.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-neutral-400">{t("noProspectsFound")}</p>
          )}
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

function SequenceStepEditor({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  step: SequenceStepInput;
  index: number;
  total: number;
  onChange: (patch: Partial<SequenceStepInput>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const t = useTranslations("NewSequenceCampaign");
  const [delayValue, setDelayValue] = useState(0);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("hours");
  const isImplemented = IMPLEMENTED_ACTION_TYPES.includes(step.actionType);

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{t("stepLabel", { index: index + 1 })}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {total > 1 && (
            <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isImplemented && (
        <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">{t("actionNotYetImplemented")}</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={step.actionType}
          onChange={(e) => onChange({ actionType: e.target.value as SequenceActionType })}
          className="col-span-2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {SEQUENCE_ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`actionType.${type}`)}
            </option>
          ))}
        </select>
        <select
          value={step.executionMode}
          onChange={(e) => onChange({ executionMode: e.target.value as ExecutionMode })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {EXECUTION_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`executionMode.${mode}`)}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <input
            type="number"
            min={0}
            value={delayValue}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              setDelayValue(v);
              onChange({ delayMinutes: delayToMinutes(v, delayUnit) });
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <select
            value={delayUnit}
            onChange={(e) => {
              const unit = e.target.value as DelayUnit;
              setDelayUnit(unit);
              onChange({ delayMinutes: delayToMinutes(delayValue, unit) });
            }}
            className="rounded-md border border-neutral-300 px-1 py-1.5 text-xs"
          >
            <option value="minutes">{t("delayMinutes")}</option>
            <option value="hours">{t("delayHours")}</option>
            <option value="days">{t("delayDays")}</option>
          </select>
        </div>
      </div>

      {step.actionType === "send_message" && (
        <textarea
          value={step.messageTemplate ?? ""}
          onChange={(e) => onChange({ messageTemplate: e.target.value })}
          rows={2}
          placeholder={t("messageTemplatePlaceholder")}
          className="mt-2 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      )}
    </div>
  );
}
