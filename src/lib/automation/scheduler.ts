import type { Lead } from "@/lib/leads/types";
import { createActions, listActionsForConnection, newAction } from "./store";
import type { AutomationAction } from "./types";

// How many days we keep re-checking an unanswered connection request before
// giving up on it (roughly 20 days at one check/day).
export const MAX_ACCEPTANCE_CHECKS = 20;

function personalize(template: string, lead: { firstName: string; lastName: string; company: string }): string {
  return template
    .replaceAll("{{firstName}}", lead.firstName)
    .replaceAll("{{lastName}}", lead.lastName)
    .replaceAll("{{company}}", lead.company);
}

function slotAtIndex(day: string, index: number, dailyLimit: number): Date {
  // Spread this day's actions across a 9:00–17:00 window instead of firing
  // them all at once — closer to how a human would space these out.
  const start = new Date(`${day}T09:00:00`);
  const windowMinutes = 8 * 60;
  const step = Math.max(5, Math.floor(windowMinutes / Math.max(dailyLimit, 1)));
  start.setMinutes(start.getMinutes() + step * index);
  return start;
}

export async function enqueueConnectionRequests(params: {
  campaignId: string;
  connectionId: string;
  connectionNote: string;
  leads: Lead[];
  dailyConnectionLimit: number;
}): Promise<number> {
  const existing = await listActionsForConnection(params.connectionId);
  const perDayCount = new Map<string, number>();
  for (const a of existing) {
    if (a.type !== "send_connection_request") continue;
    if (a.status === "failed" || a.status === "expired") continue;
    const day = a.scheduledAt.slice(0, 10);
    perDayCount.set(day, (perDayCount.get(day) ?? 0) + 1);
  }

  const actions: AutomationAction[] = [];
  const cursor = new Date();

  for (const lead of params.leads) {
    let day = cursor.toISOString().slice(0, 10);
    let count = perDayCount.get(day) ?? 0;
    while (count >= params.dailyConnectionLimit) {
      cursor.setDate(cursor.getDate() + 1);
      day = cursor.toISOString().slice(0, 10);
      count = perDayCount.get(day) ?? 0;
    }
    const scheduledAt = slotAtIndex(day, count, params.dailyConnectionLimit);
    perDayCount.set(day, count + 1);

    actions.push(
      newAction({
        campaignId: params.campaignId,
        connectionId: params.connectionId,
        leadLinkedinUrl: lead.linkedinUrl,
        leadFirstName: lead.firstName,
        leadLastName: lead.lastName,
        leadCompany: lead.company,
        type: "send_connection_request",
        payload: { text: params.connectionNote ? personalize(params.connectionNote, lead) : undefined },
        scheduledAt: scheduledAt.toISOString(),
      })
    );
  }

  await createActions(actions);
  return actions.length;
}

export async function enqueueAcceptanceCheck(
  action: AutomationAction,
  delayHours = 24
): Promise<void> {
  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  await createActions([
    newAction({
      campaignId: action.campaignId,
      connectionId: action.connectionId,
      leadLinkedinUrl: action.leadLinkedinUrl,
      leadFirstName: action.leadFirstName,
      leadLastName: action.leadLastName,
      leadCompany: action.leadCompany,
      type: "check_acceptance",
      payload: {},
      scheduledAt: scheduledAt.toISOString(),
    }),
  ]);
}

export async function enqueueMessagesAfterAcceptance(params: {
  action: AutomationAction;
  message1: string;
  followUpMessage: string;
  followUpDelayDays: number;
}): Promise<void> {
  const { action, message1, followUpMessage, followUpDelayDays } = params;
  const lead = {
    firstName: action.leadFirstName,
    lastName: action.leadLastName,
    company: action.leadCompany,
  };

  const toCreate: AutomationAction[] = [
    newAction({
      campaignId: action.campaignId,
      connectionId: action.connectionId,
      leadLinkedinUrl: action.leadLinkedinUrl,
      leadFirstName: action.leadFirstName,
      leadLastName: action.leadLastName,
      leadCompany: action.leadCompany,
      type: "send_message",
      payload: { text: personalize(message1, lead) },
      scheduledAt: new Date().toISOString(),
    }),
  ];

  if (followUpMessage.trim()) {
    const followUpAt = new Date(Date.now() + followUpDelayDays * 24 * 60 * 60 * 1000);
    toCreate.push(
      newAction({
        campaignId: action.campaignId,
        connectionId: action.connectionId,
        leadLinkedinUrl: action.leadLinkedinUrl,
        leadFirstName: action.leadFirstName,
        leadLastName: action.leadLastName,
        leadCompany: action.leadCompany,
        type: "send_message",
        payload: { text: personalize(followUpMessage, lead) },
        scheduledAt: followUpAt.toISOString(),
      })
    );
  }

  await createActions(toCreate);
}
