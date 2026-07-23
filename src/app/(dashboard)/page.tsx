import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listAgents } from "@/lib/agents/store";

export default async function GetStartedPage() {
  const [agents, t] = await Promise.all([listAgents(), getTranslations("GetStarted")]);

  return (
    <div className="max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-2 text-neutral-500">{t("intro")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/ai-assistants/new"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
        >
          <div className="text-sm font-medium text-neutral-900">{t("step1Title")}</div>
          <p className="mt-1 text-sm text-neutral-500">{t("step1Description")}</p>
        </Link>
        <Link
          href="/sandbox"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
        >
          <div className="text-sm font-medium text-neutral-900">{t("step2Title")}</div>
          <p className="mt-1 text-sm text-neutral-500">{t("step2Description")}</p>
        </Link>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">{t("yourAgents")}</h2>
          <Link href="/ai-assistants" className="text-sm text-neutral-500 hover:text-neutral-900">
            {t("seeAll")} →
          </Link>
        </div>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">{t("noAgentsYet")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {agents.slice(0, 5).map((agent) => (
              <li key={agent.id} className="px-4 py-3 text-sm">
                <Link href={`/ai-assistants/${agent.id}`} className="font-medium text-neutral-900 hover:underline">
                  {agent.name || t("unnamed")}
                </Link>
                <span className="ml-2 text-neutral-400">{agent.companyName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
