import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listAgents } from "@/lib/agents/store";
import { listLeadLists } from "@/lib/leads/store";
import CampaignForm from "./CampaignForm";

export default async function NewCampaignPage() {
  const [agents, leadLists, t] = await Promise.all([
    listAgents(),
    listLeadLists(),
    getTranslations("NewCampaign"),
  ]);

  if (leadLists.length === 0) {
    return (
      <div className="max-w-2xl px-8 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
          {t("prerequisitesIntro")}
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              {t.rich("needLeadList", { strong: (chunks) => <strong>{chunks}</strong> })} (
              <Link href="/lead-finder/import" className="text-neutral-900 underline">
                {t("importOne")}
              </Link>
              )
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
      <div className="mt-6">
        <CampaignForm agents={agents} leadLists={leadLists} />
      </div>
    </div>
  );
}
