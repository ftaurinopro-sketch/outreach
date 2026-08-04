"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AgentInput } from "@/lib/agents/types";

type StepKey = keyof AgentInput;

type FieldStep = {
  type: "field";
  key: StepKey;
  multiline?: boolean;
  hasQuickReplies?: boolean;
  optional?: boolean;
};
type WebsiteStep = { type: "website" };
type StepConfig = FieldStep | WebsiteStep;

// Fields the website-analysis step can propose an answer for — shown as a
// suggestion card the user can accept with one click or override by typing,
// same as the quick-reply chips on the other steps.
const AUTO_FILLABLE_KEYS: StepKey[] = ["companyName", "valueProp", "products", "differentiation", "icp"];

const STEP_ORDER: StepConfig[] = [
  { type: "website" },
  { type: "field", key: "name" },
  { type: "field", key: "companyName" },
  { type: "field", key: "language", hasQuickReplies: true },
  { type: "field", key: "objective", hasQuickReplies: true },
  { type: "field", key: "valueProp", multiline: true },
  { type: "field", key: "products", multiline: true },
  { type: "field", key: "differentiation", multiline: true },
  { type: "field", key: "icp", multiline: true },
  { type: "field", key: "tone", hasQuickReplies: true },
  { type: "field", key: "goal", hasQuickReplies: true },
  { type: "field", key: "calendarLink", optional: true },
  { type: "field", key: "objections", multiline: true, optional: true },
  { type: "field", key: "guardrails", multiline: true, optional: true },
];

const FIELD_STEPS = STEP_ORDER.filter((s): s is FieldStep => s.type === "field");

type LogEntry = { from: "bot" | "user"; text: string };

export default function AgentWizard({ onSaved }: { onSaved?: (agentId: string) => void }) {
  const router = useRouter();
  const t = useTranslations("AgentWizard");
  const tSteps = useTranslations("AgentWizard.steps");

  const question = (key: StepKey) => tSteps(`${key}.question`);
  const placeholder = (key: StepKey) => tSteps(`${key}.placeholder`);
  const quickReplies = (key: StepKey): string[] => {
    try {
      return tSteps.raw(`${key}.quickReplies`) as string[];
    } catch {
      return [];
    }
  };
  const questionForStep = (s: StepConfig) => (s.type === "website" ? t("websiteQuestion") : question(s.key));

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<AgentInput>>({});
  const [suggestions, setSuggestions] = useState<Partial<AgentInput>>({});
  const [log, setLog] = useState<LogEntry[]>([{ from: "bot", text: questionForStep(STEP_ORDER[0]) }]);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  const step = stepIndex < STEP_ORDER.length ? STEP_ORDER[stepIndex] : null;
  const progress = useMemo(() => Math.round((stepIndex / STEP_ORDER.length) * 100), [stepIndex]);
  const suggestion = step?.type === "field" ? suggestions[step.key] : undefined;

  function advanceToStep(index: number, baseLog: LogEntry[]) {
    const nextLog = [...baseLog];
    if (index < STEP_ORDER.length) {
      nextLog.push({ from: "bot", text: questionForStep(STEP_ORDER[index]) });
    }
    setLog(nextLog);
    setStepIndex(index);
    setInputValue("");
  }

  function advance(value: string) {
    if (!step || step.type !== "field") return;
    const trimmed = value.trim();
    if (!trimmed && !step.optional) return;

    setAnswers((prev) => ({ ...prev, [step.key]: trimmed }));
    advanceToStep(stepIndex + 1, [...log, { from: "user", text: trimmed || t("skippedLabel") }]);
  }

  async function handleWebsiteSubmit(url: string) {
    const trimmed = url.trim();
    const baseLog: LogEntry[] = [...log, { from: "user", text: trimmed || t("skippedLabel") }];

    if (!trimmed) {
      advanceToStep(stepIndex + 1, baseLog);
      return;
    }

    setLog(baseLog);
    setInputValue("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/agents/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) throw new Error();
      const data: Record<string, string> = await res.json();

      const found: Partial<AgentInput> = {};
      for (const key of AUTO_FILLABLE_KEYS) {
        if (typeof data[key] === "string" && data[key].trim()) found[key] = data[key].trim();
      }
      setSuggestions(found);

      const summary = Object.keys(found).length > 0 ? t("websiteAnalyzed") : t("websiteAnalyzedNothing");
      advanceToStep(stepIndex + 1, [...baseLog, { from: "bot", text: summary }]);
    } catch {
      advanceToStep(stepIndex + 1, [...baseLog, { from: "bot", text: t("websiteAnalysisFailed") }]);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("saveError"));
      }
      const { agent } = await res.json();
      if (onSaved) {
        onSaved(agent.id);
      } else {
        router.push(`/ai-assistants/${agent.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unexpectedError"));
      setSaving(false);
    }
  }

  const isReview = stepIndex >= STEP_ORDER.length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="h-1.5 w-full rounded-t-lg bg-neutral-100">
        <div
          className="h-1.5 rounded-t-lg bg-indigo-600 transition-all"
          style={{ width: `${isReview ? 100 : progress}%` }}
        />
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-5">
        {log.map((entry, i) => (
          <div key={i} className={`flex ${entry.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm ${
                entry.from === "user" ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
        {analyzing && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg bg-neutral-100 px-3.5 py-2 text-sm text-neutral-500">
              {t("websiteAnalyzing")}
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      <div className="border-t border-neutral-200 p-4">
        {isReview ? (
          <div>
            <p className="text-sm text-neutral-600">{t("reviewIntro")}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {FIELD_STEPS.map((s) => (
                <div key={s.key} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-neutral-400">{s.key}</dt>
                  <dd className="text-neutral-800">{answers[s.key] || "—"}</dd>
                </div>
              ))}
            </dl>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? t("saving") : t("saveAssistant")}
            </button>
          </div>
        ) : step?.type === "website" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleWebsiteSubmit(inputValue);
            }}
            className="flex items-end gap-2"
          >
            <input
              type="url"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("websitePlaceholder")}
              disabled={analyzing}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="shrink-0 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {analyzing ? t("websiteAnalyzing") : t("websiteAnalyze")}
            </button>
            <button
              type="button"
              onClick={() => handleWebsiteSubmit("")}
              disabled={analyzing}
              className="shrink-0 rounded-md px-2 py-2 text-sm text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
            >
              {t("skip")}
            </button>
          </form>
        ) : (
          <div>
            {suggestion && (
              <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-xs font-medium text-indigo-600">{t("suggestionLabel")}</p>
                <p className="mt-1 text-sm text-indigo-900">{suggestion}</p>
                <button
                  type="button"
                  onClick={() => advance(suggestion)}
                  className="mt-2 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  {t("useSuggestion")}
                </button>
              </div>
            )}
            {step?.hasQuickReplies && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quickReplies(step.key).map((option) => (
                  <button
                    key={option}
                    onClick={() => advance(option)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:border-indigo-600 hover:bg-neutral-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                advance(inputValue);
              }}
              className="flex items-end gap-2"
            >
              {step?.multiline ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={step ? placeholder(step.key) : ""}
                  rows={2}
                  className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      advance(inputValue);
                    }
                  }}
                />
              ) : (
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={step ? placeholder(step.key) : ""}
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
              )}
              <button
                type="submit"
                className="shrink-0 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t("send")}
              </button>
              {step?.optional && (
                <button
                  type="button"
                  onClick={() => advance("")}
                  className="shrink-0 rounded-md px-2 py-2 text-sm text-neutral-400 hover:text-neutral-700"
                >
                  {t("skip")}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
