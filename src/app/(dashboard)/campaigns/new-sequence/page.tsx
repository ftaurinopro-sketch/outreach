import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listAgents } from "@/lib/agents/store";
import { listProspects } from "@/lib/prospects/store";
import NewSequenceCampaignForm from "./NewSequenceCampaignForm";

export default async function NewSequenceCampaignPage() {
  const [agents, prospects, t] = await Promise.all([
    listAgents(),
    listProspects(),
    getTranslations("NewSequenceCampaign"),
  ]);

  if (prospects.length === 0) {
    return (
      <div className="max-w-2xl px-8 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
          {t("needProspects")} (
          <Link href="/prospects" className="text-neutral-900 underline">
            {t("addSome")}
          </Link>
          )
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
      <div className="mt-6">
        <NewSequenceCampaignForm agents={agents} prospects={prospects} />
      </div>
    </div>
  );
}
