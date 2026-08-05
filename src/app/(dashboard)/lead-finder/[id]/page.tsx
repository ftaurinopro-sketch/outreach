import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getLeadList } from "@/lib/leads/store";
import { listAgents } from "@/lib/agents/store";
import { listCampaigns } from "@/lib/campaigns/store";
import { listActionsForCampaigns } from "@/lib/automation/store";
import { hasClaudeConfig } from "@/lib/claude";
import DeleteListButton from "./DeleteListButton";
import ScoreListButton from "./ScoreListButton";
import LeadFilterTable from "./LeadFilterTable";

type Props = { params: Promise<{ id: string }> };

export default async function LeadListPage({ params }: Props) {
  const { id } = await params;
  const [list, agents, campaigns, t, locale] = await Promise.all([
    getLeadList(id),
    listAgents(),
    listCampaigns(),
    getTranslations("LeadListDetail"),
    getLocale(),
  ]);
  if (!list) notFound();

  const campaignsForList = campaigns.filter((c) => c.leadListId === list.id && c.status !== "draft");
  const actionsByCampaign = await listActionsForCampaigns(campaignsForList.map((c) => c.id));
  const contactedUrls = [
    ...new Set(
      [...actionsByCampaign.values()]
        .flat()
        .filter((a) => a.type === "send_connection_request" && a.status === "done")
        .map((a) => a.leadLinkedinUrl)
    ),
  ];

  const scoredCount = list.leads.filter((l) => l.fitCategory).length;

  return (
    <div className="max-w-5xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{list.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t("summary", {
              count: list.leads.length,
              date: new Date(list.createdAt).toLocaleDateString(locale),
            })}
            {scoredCount > 0 && ` · ${t("scoredCount", { count: scoredCount })}`}
          </p>
        </div>
        <DeleteListButton listId={list.id} />
      </div>

      <div className="mt-4">
        <ScoreListButton listId={list.id} agents={agents} hasClaudeConfig={hasClaudeConfig()} />
      </div>

      <LeadFilterTable leads={list.leads} contactedUrls={contactedUrls} />
    </div>
  );
}
