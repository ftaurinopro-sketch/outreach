"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AgentInput } from "@/lib/agents/types";

type StepKey = keyof AgentInput;

type Step = {
  key: StepKey;
  question: (answers: Partial<AgentInput>) => string;
  placeholder: string;
  multiline?: boolean;
  quickReplies?: string[];
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    key: "name",
    question: () =>
      'Come vuoi chiamare questo agent? È il nome con cui lo riconoscerai tra i tuoi assistant (es. "Outreach agenzie marketing").',
    placeholder: "Outreach agenzie marketing",
  },
  {
    key: "companyName",
    question: () => "Qual è il nome della tua azienda o del prodotto che questo agent rappresenta?",
    placeholder: "Es. Acme Studio",
  },
  {
    key: "valueProp",
    question: () => "Cosa fai, in una frase? (la tua value proposition)",
    placeholder: "Aiutiamo le agenzie di marketing a...",
    multiline: true,
  },
  {
    key: "differentiation",
    question: () => "Perché un prospect dovrebbe scegliere te e non i competitor?",
    placeholder: "Quello che ci rende diversi è...",
    multiline: true,
  },
  {
    key: "icp",
    question: () => "Chi è il tuo cliente ideale? (ruolo, settore, dimensione azienda)",
    placeholder: "Es. founder o head of growth in agenzie B2B da 5-50 persone",
    multiline: true,
  },
  {
    key: "tone",
    question: () => "Che tono deve usare l'assistant?",
    placeholder: "Scrivi un tono personalizzato oppure scegli qui sotto",
    quickReplies: ["Casual", "Professionale", "Diretto", "Consulenziale"],
  },
  {
    key: "goal",
    question: () => "Qual è l'obiettivo finale della conversazione?",
    placeholder: "Scrivi un obiettivo personalizzato oppure scegli qui sotto",
    quickReplies: ["Prenotare una call", "Raccogliere l'email", "Qualificare il lead"],
  },
  {
    key: "calendarLink",
    question: () =>
      "Link di prenotazione (Calendly, HubSpot, Cal.com...) da mandare quando il prospect è pronto a fissare una call.",
    placeholder: "https://calendly.com/tuonome",
    optional: true,
  },
  {
    key: "objections",
    question: () =>
      "Ci sono obiezioni comuni che l'agent dovrebbe saper gestire? Più dettagli fornisci, meglio risponderà.",
    placeholder: "Es. \"Costa troppo\" → rispondi spiegando il ROI medio dei clienti...",
    multiline: true,
    optional: true,
  },
  {
    key: "guardrails",
    question: () => "C'è qualcosa che l'agent non deve mai dire o fare?",
    placeholder: "Es. non parlare mai di prezzo, non promettere sconti...",
    multiline: true,
    optional: true,
  },
];

type LogEntry = { from: "bot" | "user"; text: string };

export default function AgentWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<AgentInput>>({});
  const [log, setLog] = useState<LogEntry[]>([
    { from: "bot", text: STEPS[0].question({}) },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = stepIndex < STEPS.length ? STEPS[stepIndex] : null;
  const progress = useMemo(
    () => Math.round((stepIndex / STEPS.length) * 100),
    [stepIndex]
  );

  function advance(value: string) {
    if (!step) return;
    const trimmed = value.trim();
    if (!trimmed && !step.optional) return;

    const nextAnswers = { ...answers, [step.key]: trimmed };
    setAnswers(nextAnswers);

    const nextLog: LogEntry[] = [...log, { from: "user", text: trimmed || "(saltato)" }];

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      nextLog.push({ from: "bot", text: STEPS[nextIndex].question(nextAnswers) });
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
        throw new Error(data.error || "Errore nel salvataggio");
      }
      const { agent } = await res.json();
      router.push(`/ai-assistants/${agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
      setSaving(false);
    }
  }

  const isReview = stepIndex >= STEPS.length;

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
          <div
            key={i}
            className={`flex ${entry.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm ${
                entry.from === "user"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-800"
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
            <p className="text-sm text-neutral-600">
              Fatto! Rivedi il riepilogo qui sotto e salva per creare l&apos;agent.
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {STEPS.map((s) => (
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
              {saving ? "Salvataggio..." : "Salva Assistant"}
            </button>
          </div>
        ) : (
          <div>
            {step?.quickReplies && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {step.quickReplies.map((option) => (
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
                  placeholder={step.placeholder}
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
                  placeholder={step?.placeholder}
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                />
              )}
              <button
                type="submit"
                className="shrink-0 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Invia
              </button>
              {step?.optional && (
                <button
                  type="button"
                  onClick={() => advance("")}
                  className="shrink-0 rounded-md px-2 py-2 text-sm text-neutral-400 hover:text-neutral-700"
                >
                  Salta
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
