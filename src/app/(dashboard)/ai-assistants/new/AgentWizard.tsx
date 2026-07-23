"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AgentInput } from "@/lib/agents/types";

type StepKey = keyof AgentInput;

type StepConfig = {
  key: StepKey;
  multiline?: boolean;
  hasQuickReplies?: boolean;
  optional?: boolean;
};

const STEP_ORDER: StepConfig[] = [
  { key: "name" },
  { key: "companyName" },
  { key: "language", hasQuickReplies: true },
  { key: "objective", hasQuickReplies: true },
  { key: "valueProp", multiline: true },
  { key: "products", multiline: true },
  { key: "differentiation", multiline: true },
  { key: "icp", multiline: true },
  { key: "tone", hasQuickReplies: true },
  { key: "goal", hasQuickReplies: true },
  { key: "calendarLink", optional: true },
  { key: "objections", multiline: true, optional: true },
  { key: "guardrails", multiline: true, optional: true },
];

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

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<AgentInput>>({});
  const [log, setLog] = useState<LogEntry[]>([{ from: "bot", text: question(STEP_ORDER[0].key) }]);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = stepIndex < STEP_ORDER.length ? STEP_ORDER[stepIndex] : null;
  const progress = useMemo(() => Math.round((stepIndex / STEP_ORDER.length) * 100), [stepIndex]);

  function advance(value: string) {
    if (!step) return;
    const trimmed = value.trim();
    if (!trimmed && !step.optional) return;

    const nextAnswers = { ...answers, [step.key]: trimmed };
    setAnswers(nextAnswers);

    const nextLog: LogEntry[] = [...log, { from: "user", text: trimmed || t("skippedLabel") }];

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      nextLog.push({ from: "bot", text: question(STEP_ORDER[nextIndex].key) });
    }
    setLog(nextLog);
    setStepIndex(nextIndex);
    setInputValue("");
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
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="h-1.5 w-full rounded-t-lg bg-neutral-100">
        <div
          className="h-1.5 rounded-t-lg bg-neutral-900 transition-all"
          style={{ width: `${isReview ? 100 : progress}%` }}
        />
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-5">
        {log.map((entry, i) => (
          <div key={i} className={`flex ${entry.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm ${
                entry.from === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-200 p-4">
        {isReview ? (
          <div>
            <p className="text-sm text-neutral-600">{t("reviewIntro")}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {STEP_ORDER.map((s) => (
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
              className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? t("saving") : t("saveAssistant")}
            </button>
          </div>
        ) : (
          <div>
            {step?.hasQuickReplies && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quickReplies(step.key).map((option) => (
                  <button
                    key={option}
                    onClick={() => advance(option)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50"
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
                  className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
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
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                />
              )}
              <button
                type="submit"
                className="shrink-0 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
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
