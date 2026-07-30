import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCampaign } from "@/lib/campaigns/store";
import { getAgent } from "@/lib/agents/store";
import { getLeadList } from "@/lib/leads/store";
import { listConnections } from "@/lib/connections/store";
import { toPublicConnection } from "@/lib/connections/types";
import { listActionsForCampaign } from "@/lib/automation/store";
import { getCampaignMonitoring } from "@/lib/campaigns/monitoring";
import DeleteCampaignButton from "./DeleteCampaignButton";
import ActivateCampaignPanel from "./ActivateCampaignPanel";
import ActionsQueue from "./ActionsQueue";
import MonitoringPanel from "./MonitoringPanel";
import PauseResumeCampaignButton from "./PauseResumeCampaignButton";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [agent, leadList, connections, actions, t, locale] = await Promise.all([
    getAgent(campaign.agentId),
    getLeadList(campaign.leadListId),
    listConnections(),
    campaign.status !== "draft" ? listActionsForCampaign(campaign.id) : Promise.resolve([]),
    getTranslations("CampaignDetail"),
    getLocale(),
  ]);

  const monitoring = getCampaignMonitoring(leadList?.leads ?? [], actions);

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{campaign.name}</h1>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
              campaign.status === "active"
                ? "bg-green-100 text-green-700"
                : campaign.status === "paused"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {campaign.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PauseResumeCampaignButton campaignId={campaign.id} status={campaign.status} />
          <DeleteCampaignButton campaignId={campaign.id} />
        </div>
      </div>

      {campaign.status === "draft" ? (
        <div className="mt-6">
          <ActivateCampaignPanel campaignId={campaign.id} connections={connections.map(toPublicConnection)} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <MonitoringPanel monitoring={monitoring} locale={locale} />
          <details>
            <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-600">
              {t("rawActionLog")}
            </summary>
            <div className="mt-2">
              <ActionsQueue actions={actions} />
            </div>
          </details>
        </div>
      )}

      <div className="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-5 text-sm">
        <Row label={t("leadList")}>
          {leadList ? (
            <Link href={`/lead-finder/${leadList.id}`} className="text-neutral-900 hover:underline">
              {leadList.name} ({leadList.leads.length} {t("leads")})
            </Link>
          ) : (
            <span className="text-red-600">{t("listDeleted")}</span>
          )}
        </Row>
        <Row label={t("aiAssistant")}>
          {agent ? (
            <Link href={`/ai-assistants/${agent.id}`} className="text-neutral-900 hover:underline">
              {agent.name}
            </Link>
          ) : (
            <span className="text-red-600">{t("agentDeleted")}</span>
          )}
        </Row>
        <Row label={t("connectionNote")}>
          {campaign.connectionNote || <span className="text-neutral-400">—</span>}
        </Row>
        <Row label={t("messageSequence")}>
          <ol className="space-y-2">
            {campaign.messages.map((step, i) => (
              <li key={step.id} className="rounded-md border border-neutral-100 bg-neutral-50 p-2.5">
                <div className="text-xs font-medium text-neutral-500">
                  {i === 0 ? t("messageStepFirst") : t("messageStepDelayed", { index: i + 1, days: step.delayDays })}
                </div>
                <div className="mt-1 text-neutral-800">{step.text}</div>
              </li>
            ))}
          </ol>
        </Row>
        <Row label={t("replyMode")}>
          {campaign.replyMode === "autonomous" ? t("fullyAutonomous") : t("reviewBeforeSending")}
        </Row>
        <Row label={t("automationSettings")}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-neutral-500">
              {t("workingDays")}: <span className="text-neutral-800">{formatWorkingDays(campaign.automationSettings.workingDays, t)}</span>
            </span>
            <span className="text-neutral-500">
              {t("sendHours")}:{" "}
              <span className="text-neutral-800">
                {campaign.automationSettings.sendHourStart}:00–{campaign.automationSettings.sendHourEnd}:00
              </span>
            </span>
            <span className="text-neutral-500">
              {t("randomDelay")}: <span className="text-neutral-800">{campaign.automationSettings.randomDelayMinutes} min</span>
            </span>
            <span className="text-neutral-500">
              {t("dailyCap")}:{" "}
              <span className="text-neutral-800">{campaign.automationSettings.dailyConnectionCap ?? t("useAccountLimit")}</span>
            </span>
            <span className="text-neutral-500">
              {t("weeklyCap")}:{" "}
              <span className="text-neutral-800">{campaign.automationSettings.weeklyConnectionCap ?? t("useAccountLimit")}</span>
            </span>
          </div>
        </Row>
      </div>
    </div>
  );
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function formatWorkingDays(days: number[], t: (key: string) => string): string {
  if (days.length === 7) return t("everyDay");
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => t(`weekday.${WEEKDAY_KEYS[d]}`))
    .join(", ");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">{label}</div>
      <div className="mt-0.5 text-neutral-800">{children}</div>
    </div>
  );
}
