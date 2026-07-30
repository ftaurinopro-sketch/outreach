import type { AutomationAction } from "@/lib/automation/types";
import type { Lead } from "@/lib/leads/types";

export type LeadStatus =
  | "pending"
  | "connection_sent"
  | "connected"
  | "messaging"
  | "replied"
  | "done"
  | "failed";

export const LEAD_STATUSES: LeadStatus[] = [
  "pending",
  "connection_sent",
  "connected",
  "messaging",
  "replied",
  "done",
  "failed",
];

export type LeadMonitoringRow = {
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  company: string;
  status: LeadStatus;
  connectionSentAt: string | null;
  connectedAt: string | null;
  messagesSent: number;
  lastActivityAt: string | null;
};

export type CampaignMonitoring = {
  rows: LeadMonitoringRow[];
  counts: Record<LeadStatus, number>;
};

export function getCampaignMonitoring(leads: Lead[], actions: AutomationAction[]): CampaignMonitoring {
  const actionsByLead = new Map<string, AutomationAction[]>();
  for (const action of actions) {
    const list = actionsByLead.get(action.leadLinkedinUrl);
    if (list) list.push(action);
    else actionsByLead.set(action.leadLinkedinUrl, [action]);
  }

  const counts: Record<LeadStatus, number> = {
    pending: 0,
    connection_sent: 0,
    connected: 0,
    messaging: 0,
    replied: 0,
    done: 0,
    failed: 0,
  };

  const rows: LeadMonitoringRow[] = leads.map((lead) => {
    const leadActions = actionsByLead.get(lead.linkedinUrl) ?? [];

    const connectionRequest = leadActions.find((a) => a.type === "send_connection_request");
    const acceptanceCheck = leadActions
      .filter((a) => a.type === "check_acceptance")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const messageActions = leadActions.filter((a) => a.type === "send_message");
    const replied = leadActions.some(
      (a) => a.type === "check_reply" && a.status === "done" && a.payload.replied
    );

    const connectionSentAt = connectionRequest?.status === "done" ? connectionRequest.createdAt : null;
    const connectedAt = acceptanceCheck?.status === "done" ? acceptanceCheck.createdAt : null;
    const doneMessages = messageActions.filter((a) => a.status === "done");
    const lastMessageAt = doneMessages
      .map((a) => a.createdAt)
      .sort()
      .at(-1);

    const lastActivityAt = [connectionSentAt, connectedAt, lastMessageAt, ...(replied ? [leadActions.find((a) => a.type === "check_reply" && a.payload.replied)?.createdAt] : [])]
      .filter((v): v is string => !!v)
      .sort()
      .at(-1) ?? null;

    let status: LeadStatus;
    const hasFailedConnection = connectionRequest?.status === "failed";
    const neverAccepted = acceptanceCheck?.status === "expired";
    const hasIncompleteMessages = messageActions.some(
      (a) => a.status === "pending" || a.status === "in_progress"
    );

    if (hasFailedConnection || neverAccepted) {
      status = "failed";
    } else if (replied) {
      status = "replied";
    } else if (connectedAt && !hasIncompleteMessages && messageActions.length > 0) {
      status = "done";
    } else if (connectedAt && messageActions.length > 0) {
      status = "messaging";
    } else if (connectedAt) {
      status = "connected";
    } else if (connectionSentAt) {
      status = "connection_sent";
    } else {
      status = "pending";
    }

    counts[status] += 1;

    return {
      linkedinUrl: lead.linkedinUrl,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      status,
      connectionSentAt,
      connectedAt,
      messagesSent: doneMessages.length,
      lastActivityAt,
    };
  });

  rows.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));

  return { rows, counts };
}
