"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AgentConfig } from "@/lib/agents/types";

export default function ScoreListButton({
  listId,
  agents,
  hasClaudeConfig,
}: {
  listId: string;
  agents: AgentConfig[];
  hasClaudeConfig: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("ScoreListButton");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasClaudeConfig) {
    return <p className="text-xs text-amber-700">{t("missingApiKey")}</p>;
  }

  if (agents.length === 0) {
    return <p className="text-xs text-neutral-400">{t("needAgent")}</p>;
  }

  async function handleScore() {
    setScoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/lead-lists/${listId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("scoreError"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreError"));
    } finally {
      setScoring(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        disabled={scoring}
      >
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleScore}
        disabled={scoring}
        className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {scoring ? t("scoring") : t("scoreWithAi")}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
