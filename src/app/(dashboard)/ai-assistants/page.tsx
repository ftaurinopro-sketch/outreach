import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listAgents } from "@/lib/agents/store";

export default async function AiAssistantsPage() {
  const [agents, t] = await Promise.all([listAgents(), getTranslations("AiAssistantsList")]);

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
        </div>
        <Link
          href="/ai-assistants/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {t("newAssistant")}
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <li key={agent.id}>
              <Link
                href={`/ai-assistants/${agent.id}`}
                className="block rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
              >
                <div className="font-medium text-neutral-900">{agent.name || t("unnamed")}</div>
                <div className="mt-1 text-sm text-neutral-500">{agent.companyName}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {t("tone")}: {agent.tone}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {agent.goal}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
