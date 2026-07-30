import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Users,
  UserPlus,
  UserCheck,
  MessageSquare,
  Percent,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CalendarCheck,
  Reply,
  ThumbsUp,
  Megaphone,
  PauseCircle,
  CheckCircle2,
  Circle,
  Search,
  Bot,
  Link2,
  FileUp,
  type LucideIcon,
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";

const QUICK_ACTIONS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/campaigns/new", key: "newCampaign", icon: Megaphone },
  { href: "/lead-finder/import-search", key: "importFromSalesNav", icon: Search },
  { href: "/lead-finder/import", key: "createLeadList", icon: FileUp },
  { href: "/ai-assistants/new", key: "configureAgent", icon: Bot },
  { href: "/connections", key: "connectAccount", icon: Link2 },
];

const FUNNEL_STAGES = [
  "totalLeads",
  "connectionsSent",
  "connectionsAccepted",
  "firstMessageSent",
  "repliesReceived",
  "positiveReplies",
  "meetingsBooked",
  "customersAcquired",
] as const;

export default async function HomePage() {
  const [metrics, t, locale] = await Promise.all([
    getDashboardMetrics(),
    getTranslations("Dashboard"),
    getLocale(),
  ]);

  const checklistItems: { key: keyof typeof metrics.checklist; href: string }[] = [
    { key: "connectLinkedin", href: "/connections" },
    { key: "configureAgent", href: "/ai-assistants/new" },
    { key: "importLeadList", href: "/lead-finder" },
    { key: "createCampaign", href: "/campaigns/new" },
    { key: "startAutomation", href: "/campaigns" },
  ];

  return (
    <div className="max-w-6xl px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ href, key, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-900"
            >
              <Icon className="h-4 w-4" />
              {t(`quickActions.${key}`)}
            </Link>
          ))}
        </div>
      </div>

      {!metrics.hasAnyCampaign ? (
        <div className="mt-8 max-w-2xl">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-neutral-900">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{t("emptyState.welcome")}</h2>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{t("emptyState.subtitle")}</p>
            <ul className="mt-5 space-y-1">
              {checklistItems.map(({ key, href }) => {
                const done = metrics.checklist[key];
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-neutral-300" />
                      )}
                      <span className={done ? "text-neutral-400 line-through" : "text-neutral-800"}>
                        {t(`emptyState.checklist.${key}`)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard icon={Megaphone} label={t("kpi.activeCampaigns")} value={String(metrics.kpis.activeCampaigns)} />
            <KpiCard icon={PauseCircle} label={t("kpi.pausedCampaigns")} value={String(metrics.kpis.pausedCampaigns)} />
            <KpiCard icon={Users} label={t("kpi.totalProspects")} value={String(metrics.kpis.totalProspects)} />
            <KpiCard icon={UserCheck} label={t("kpi.engagedProspects")} value={String(metrics.kpis.engagedProspects)} />
            <KpiCard
              icon={UserPlus}
              label={t("kpi.connectionsSent")}
              value={String(metrics.kpis.connectionsSent)}
              delta={metrics.kpis.connectionsSentDelta}
            />
            <KpiCard
              icon={UserCheck}
              label={t("kpi.connectionsAccepted")}
              value={String(metrics.kpis.connectionsAccepted)}
              delta={metrics.kpis.connectionsAcceptedDelta}
            />
            <KpiCard
              icon={Percent}
              label={t("kpi.acceptanceRate")}
              value={metrics.kpis.acceptanceRate !== null ? `${metrics.kpis.acceptanceRate}%` : "—"}
            />
            <KpiCard
              icon={MessageSquare}
              label={t("kpi.messagesSent")}
              value={String(metrics.kpis.messagesSent)}
              delta={metrics.kpis.messagesSentDelta}
            />
            <KpiCard
              icon={Reply}
              label={t("kpi.replyRate")}
              value={metrics.kpis.replyRate !== null ? `${metrics.kpis.replyRate}%` : "—"}
            />
            <KpiCard
              icon={ThumbsUp}
              label={t("kpi.positiveReplies")}
              value="—"
              notTrackedYet
              notTrackedLabel={t("notTrackedYet")}
            />
            <KpiCard
              icon={CalendarCheck}
              label={t("kpi.meetings")}
              value="—"
              notTrackedYet
              notTrackedLabel={t("notTrackedYet")}
            />
            <KpiCard
              icon={Sparkles}
              label={t("kpi.avgAiScore")}
              value={metrics.kpis.avgAiScore !== null ? `${metrics.kpis.avgAiScore}/100` : "—"}
            />
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-900">{t("activeCampaignsSection.title")}</h2>
              <Link href="/campaigns" className="text-sm text-neutral-500 hover:text-neutral-900">
                {t("activeCampaignsSection.seeAll")} →
              </Link>
            </div>
            {metrics.campaignCards.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-sm text-neutral-500">
                {t("activeCampaignsSection.empty")}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {metrics.campaignCards.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:border-neutral-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900">{c.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          c.displayStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : c.displayStatus === "paused"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {t(`campaignCard.status.${c.displayStatus}`)}
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-neutral-900"
                        style={{ width: `${c.progressPct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {t("campaignCard.progress", { contacted: c.contactedLeads, total: c.totalLeads })}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-neutral-500">
                      <span>
                        {t("campaignCard.connectionsSent")}: <strong className="text-neutral-800">{c.connectionsSent}</strong>
                      </span>
                      <span>
                        {t("campaignCard.connectionsAccepted")}:{" "}
                        <strong className="text-neutral-800">{c.connectionsAccepted}</strong>
                      </span>
                      <span>
                        {t("campaignCard.acceptanceRate")}:{" "}
                        <strong className="text-neutral-800">
                          {c.acceptanceRate !== null ? `${c.acceptanceRate}%` : "—"}
                        </strong>
                      </span>
                      <span>
                        {t("campaignCard.messagesSent")}: <strong className="text-neutral-800">{c.messagesSent}</strong>
                      </span>
                      <span>
                        {t("campaignCard.remaining")}: <strong className="text-neutral-800">{c.remainingLeads}</strong>
                      </span>
                      <span>
                        {t("campaignCard.velocity")}:{" "}
                        <strong className="text-neutral-800">
                          {c.leadsPerDay !== null ? c.leadsPerDay : "—"}
                        </strong>
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-neutral-400">
                      {t("campaignCard.lastActivity")}:{" "}
                      {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString(locale) : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-sm font-medium text-neutral-900">{t("funnel.title")}</h2>
            <div className="mt-3 space-y-2 rounded-lg border border-neutral-200 bg-white p-5">
              {FUNNEL_STAGES.map((stage) => {
                const value = metrics.funnel[stage];
                const pct =
                  metrics.funnel.totalLeads > 0 && typeof value === "number"
                    ? Math.max(Math.round((value / metrics.funnel.totalLeads) * 100), value > 0 ? 2 : 0)
                    : 0;
                return (
                  <div key={stage} className="flex items-center gap-3 text-sm">
                    <div className="w-40 shrink-0 text-neutral-600">{t(`funnel.${stage}`)}</div>
                    <div className="h-6 flex-1 overflow-hidden rounded bg-neutral-100">
                      {value !== null && (
                        <div
                          className="flex h-full items-center justify-end rounded bg-neutral-900 pr-2 text-xs text-white"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        >
                          {value}
                        </div>
                      )}
                    </div>
                    {value === null && (
                      <span className="w-24 shrink-0 text-right text-xs text-neutral-400">{t("funnel.comingSoon")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 mb-4">
            <h2 className="text-sm font-medium text-neutral-900">{t("activity.title")}</h2>
            {metrics.activity.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-sm text-neutral-500">
                {t("activity.empty")}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                {metrics.activity.map((event) => (
                  <li key={event.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-neutral-800">
                      {event.kind === "connection_sent" && t("activity.connectionSent", { name: event.leadName })}
                      {event.kind === "connection_accepted" &&
                        t("activity.connectionAccepted", { name: event.leadName })}
                      {event.kind === "message_sent" && t("activity.messageSent", { name: event.leadName })}
                      {event.kind === "lead_replied" && t("activity.leadReplied", { name: event.leadName })}
                      {event.kind === "campaign_started" &&
                        t("activity.campaignStarted", { name: event.campaignName })}
                      {event.kind === "lead_list_imported" &&
                        t("activity.leadListImported", { name: event.listName })}
                      {event.kind === "leads_scored" &&
                        t("activity.leadsScored", { count: event.count, name: event.listName })}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {new Date(event.at).toLocaleString(locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  notTrackedYet,
  notTrackedLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number | null;
  notTrackedYet?: boolean;
  notTrackedLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-neutral-900">{value}</span>
        {typeof delta === "number" && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              delta >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {notTrackedYet && <span className="text-xs text-neutral-400">{notTrackedLabel}</span>}
      </div>
    </div>
  );
}
