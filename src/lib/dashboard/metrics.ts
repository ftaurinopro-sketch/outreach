import { listCampaigns } from "@/lib/campaigns/store";
import { listActionsForCampaign } from "@/lib/automation/store";
import { listLeadLists, getLeadList } from "@/lib/leads/store";
import { listConnections } from "@/lib/connections/store";
import { listAgents } from "@/lib/agents/store";
import type { AutomationAction } from "@/lib/automation/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CampaignCard = {
  id: string;
  name: string;
  displayStatus: "active" | "paused" | "completed" | "draft";
  totalLeads: number;
  contactedLeads: number;
  remainingLeads: number;
  progressPct: number;
  connectionsSent: number;
  connectionsAccepted: number;
  acceptanceRate: number | null;
  messagesSent: number;
  lastActivityAt: string | null;
  leadsPerDay: number | null;
};

export type ActivityEvent =
  | {
      id: string;
      at: string;
      kind: "connection_sent" | "connection_accepted" | "message_sent" | "lead_replied";
      leadName: string;
    }
  | { id: string; at: string; kind: "campaign_started"; campaignName: string }
  | { id: string; at: string; kind: "lead_list_imported"; listName: string }
  | { id: string; at: string; kind: "leads_scored"; listName: string; count: number };

export type DashboardMetrics = {
  hasAnyCampaign: boolean;
  kpis: {
    activeCampaigns: number;
    pausedCampaigns: number;
    totalProspects: number;
    engagedProspects: number;
    connectionsSent: number;
    connectionsSentDelta: number | null;
    connectionsAccepted: number;
    connectionsAcceptedDelta: number | null;
    acceptanceRate: number | null;
    messagesSent: number;
    messagesSentDelta: number | null;
    repliesReceived: number;
    replyRate: number | null;
    avgAiScore: number | null;
  };
  campaignCards: CampaignCard[];
  funnel: {
    totalLeads: number;
    connectionsSent: number;
    connectionsAccepted: number;
    firstMessageSent: number;
    repliesReceived: number;
    // Sentiment classification of replies and meeting-booking detection
    // aren't implemented, so these stages have no real data source —
    // surfaced as untracked (null) rather than a fabricated zero, same as
    // "customersAcquired" below.
    positiveReplies: number | null;
    meetingsBooked: number | null;
    customersAcquired: number | null;
  };
  activity: ActivityEvent[];
  checklist: {
    connectLinkedin: boolean;
    configureAgent: boolean;
    importLeadList: boolean;
    createCampaign: boolean;
    startAutomation: boolean;
  };
};

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function isInWindow(iso: string, from: number, to: number): boolean {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [campaigns, leadListSummaries, connections, agents] = await Promise.all([
    listCampaigns(),
    listLeadLists(),
    listConnections(),
    listAgents(),
  ]);

  const nonDraftCampaigns = campaigns.filter((c) => c.status !== "draft");
  const actionsByCampaign = new Map<string, AutomationAction[]>(
    await Promise.all(
      nonDraftCampaigns.map(async (c) => [c.id, await listActionsForCampaign(c.id)] as const)
    )
  );

  const fullLeadLists = await Promise.all(leadListSummaries.map((s) => getLeadList(s.id)));
  const scoreByLinkedinUrl = new Map<string, number>();
  let totalProspects = 0;
  for (const list of fullLeadLists) {
    if (!list) continue;
    totalProspects += list.leads.length;
    for (const lead of list.leads) {
      if (typeof lead.score === "number") scoreByLinkedinUrl.set(lead.linkedinUrl, lead.score);
    }
  }

  const now = Date.now();
  const currFrom = now - SEVEN_DAYS_MS;
  const prevFrom = now - 2 * SEVEN_DAYS_MS;

  let connectionsSent = 0;
  let connectionsSentCurr = 0;
  let connectionsSentPrev = 0;
  let connectionsAccepted = 0;
  let connectionsAcceptedCurr = 0;
  let connectionsAcceptedPrev = 0;
  let messagesSent = 0;
  let messagesSentCurr = 0;
  let messagesSentPrev = 0;
  const engagedLinkedinUrls = new Set<string>();
  const firstMessageSentUrls = new Set<string>();
  const repliedLinkedinUrls = new Set<string>();
  const campaignCards: CampaignCard[] = [];
  const activity: ActivityEvent[] = [];

  for (const campaign of nonDraftCampaigns) {
    const actions = actionsByCampaign.get(campaign.id) ?? [];
    const leadList = fullLeadLists.find((l) => l?.id === campaign.leadListId) ?? null;
    const totalLeads = leadList?.leads.length ?? 0;

    const contactedUrls = new Set<string>();
    let cSent = 0;
    let cAccepted = 0;
    let mSent = 0;
    let hasPendingWork = false;
    let lastActivityAt: string | null = campaign.activatedAt;

    for (const action of actions) {
      if (action.status === "pending" || action.status === "in_progress") hasPendingWork = true;

      if (action.type === "send_connection_request" && action.status === "done") {
        cSent += 1;
        contactedUrls.add(action.leadLinkedinUrl);
        engagedLinkedinUrls.add(action.leadLinkedinUrl);
        if (isInWindow(action.createdAt, currFrom, now)) connectionsSentCurr += 1;
        else if (isInWindow(action.createdAt, prevFrom, currFrom)) connectionsSentPrev += 1;
        activity.push({
          id: action.id,
          at: action.createdAt,
          kind: "connection_sent",
          leadName: `${action.leadFirstName} ${action.leadLastName}`.trim() || action.leadLinkedinUrl,
        });
      }
      if (action.type === "check_acceptance" && action.status === "done") {
        cAccepted += 1;
        if (isInWindow(action.createdAt, currFrom, now)) connectionsAcceptedCurr += 1;
        else if (isInWindow(action.createdAt, prevFrom, currFrom)) connectionsAcceptedPrev += 1;
        activity.push({
          id: action.id,
          at: action.createdAt,
          kind: "connection_accepted",
          leadName: `${action.leadFirstName} ${action.leadLastName}`.trim() || action.leadLinkedinUrl,
        });
      }
      if (action.type === "send_message" && action.status === "done") {
        mSent += 1;
        firstMessageSentUrls.add(action.leadLinkedinUrl);
        if (isInWindow(action.createdAt, currFrom, now)) messagesSentCurr += 1;
        else if (isInWindow(action.createdAt, prevFrom, currFrom)) messagesSentPrev += 1;
        activity.push({
          id: action.id,
          at: action.createdAt,
          kind: "message_sent",
          leadName: `${action.leadFirstName} ${action.leadLastName}`.trim() || action.leadLinkedinUrl,
        });
      }
      if (action.type === "check_reply" && action.status === "done" && action.payload.replied) {
        repliedLinkedinUrls.add(action.leadLinkedinUrl);
        activity.push({
          id: action.id,
          at: action.createdAt,
          kind: "lead_replied",
          leadName: `${action.leadFirstName} ${action.leadLastName}`.trim() || action.leadLinkedinUrl,
        });
      }
      if (lastActivityAt === null || action.createdAt > lastActivityAt) lastActivityAt = action.createdAt;
    }

    connectionsSent += cSent;
    connectionsAccepted += cAccepted;
    messagesSent += mSent;

    const contactedLeads = contactedUrls.size;
    const remainingLeads = Math.max(totalLeads - contactedLeads, 0);
    const daysSinceActivation = campaign.activatedAt
      ? Math.max((now - new Date(campaign.activatedAt).getTime()) / (24 * 60 * 60 * 1000), 1)
      : null;

    const displayStatus: CampaignCard["displayStatus"] =
      campaign.status === "paused"
        ? "paused"
        : campaign.status === "active" && totalLeads > 0 && remainingLeads === 0 && !hasPendingWork
          ? "completed"
          : "active";

    campaignCards.push({
      id: campaign.id,
      name: campaign.name,
      displayStatus,
      totalLeads,
      contactedLeads,
      remainingLeads,
      progressPct: totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0,
      connectionsSent: cSent,
      connectionsAccepted: cAccepted,
      acceptanceRate: cSent > 0 ? Math.round((cAccepted / cSent) * 100) : null,
      messagesSent: mSent,
      lastActivityAt,
      leadsPerDay: daysSinceActivation ? Math.round((contactedLeads / daysSinceActivation) * 10) / 10 : null,
    });

    if (campaign.activatedAt) {
      activity.push({
        id: `campaign-started-${campaign.id}`,
        at: campaign.activatedAt,
        kind: "campaign_started",
        campaignName: campaign.name,
      });
    }
  }

  for (const list of fullLeadLists) {
    if (!list) continue;
    activity.push({
      id: `list-imported-${list.id}`,
      at: list.createdAt,
      kind: "lead_list_imported",
      listName: list.name,
    });

    const scoredAts = list.leads.map((l) => l.scoredAt).filter((v): v is string => !!v);
    if (scoredAts.length > 0) {
      const latest = scoredAts.reduce((a, b) => (a > b ? a : b));
      activity.push({
        id: `list-scored-${list.id}`,
        at: latest,
        kind: "leads_scored",
        listName: list.name,
        count: scoredAts.length,
      });
    }
  }

  activity.sort((a, b) => b.at.localeCompare(a.at));

  const scoredEngaged = [...engagedLinkedinUrls]
    .map((url) => scoreByLinkedinUrl.get(url))
    .filter((s): s is number => typeof s === "number");
  const avgAiScore =
    scoredEngaged.length > 0
      ? Math.round((scoredEngaged.reduce((a, b) => a + b, 0) / scoredEngaged.length) * 10) / 10
      : null;

  const activeCampaigns = campaignCards.filter((c) => c.displayStatus === "active").length;
  const pausedCampaigns = campaignCards.filter((c) => c.displayStatus === "paused").length;

  return {
    hasAnyCampaign: campaigns.length > 0,
    kpis: {
      activeCampaigns,
      pausedCampaigns,
      totalProspects,
      engagedProspects: engagedLinkedinUrls.size,
      connectionsSent,
      connectionsSentDelta: pctDelta(connectionsSentCurr, connectionsSentPrev),
      connectionsAccepted,
      connectionsAcceptedDelta: pctDelta(connectionsAcceptedCurr, connectionsAcceptedPrev),
      acceptanceRate: connectionsSent > 0 ? Math.round((connectionsAccepted / connectionsSent) * 100) : null,
      messagesSent,
      messagesSentDelta: pctDelta(messagesSentCurr, messagesSentPrev),
      repliesReceived: repliedLinkedinUrls.size,
      replyRate:
        firstMessageSentUrls.size > 0
          ? Math.round((repliedLinkedinUrls.size / firstMessageSentUrls.size) * 100)
          : null,
      avgAiScore,
    },
    campaignCards: campaignCards.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "")),
    funnel: {
      totalLeads: totalProspects,
      connectionsSent,
      connectionsAccepted,
      firstMessageSent: firstMessageSentUrls.size,
      repliesReceived: repliedLinkedinUrls.size,
      positiveReplies: null,
      meetingsBooked: null,
      customersAcquired: null,
    },
    activity: activity.slice(0, 10),
    checklist: {
      connectLinkedin: connections.length > 0,
      configureAgent: agents.length > 0,
      importLeadList: leadListSummaries.length > 0,
      createCampaign: campaigns.length > 0,
      startAutomation: campaigns.some((c) => c.status === "active" || c.status === "paused"),
    },
  };
}

