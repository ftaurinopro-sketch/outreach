import { getTranslations } from "next-intl/server";
import { listAgents } from "@/lib/agents/store";
import { hasClaudeConfig } from "@/lib/claude";
import SandboxClient from "./SandboxClient";

type Props = { searchParams: Promise<{ agent?: string }> };

export default async function SandboxPage({ searchParams }: Props) {
  const [agents, { agent: initialAgentId }, t] = await Promise.all([
    listAgents(),
    searchParams,
    getTranslations("SandboxPage"),
  ]);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">{t("description")}</p>

      {!hasClaudeConfig() && (
        <div className="mt-4 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.rich("missingApiKey", {
            key: (chunks) => <code className="font-mono">{chunks}</code>,
            env: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </div>
      )}

      {agents.length === 0 ? (
        <div className="mt-6 max-w-2xl rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          {t("noAgents")}
        </div>
      ) : (
        <div className="mt-6">
          <SandboxClient agents={agents} initialAgentId={initialAgentId} />
        </div>
      )}
    </div>
  );
}
