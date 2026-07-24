import type { Lead } from "@/lib/leads/types";
import type { CampaignAutomationSettings, CampaignMessageStep } from "@/lib/campaigns/types";
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

function isWorkingDay(date: Date, workingDays: number[]): boolean {
  return workingDays.length === 0 || workingDays.includes(date.getDay());
}

function nextWorkingDay(date: Date, workingDays: number[]): Date {
  const d = new Date(date);
  // Bail out after a week even if workingDays is somehow empty/invalid —
  // isWorkingDay already treats an empty list as "every day", so this is
  // just a safety net against an infinite loop.
  for (let i = 0; i < 7 && !isWorkingDay(d, workingDays); i++) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function mondayOf(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const weekday = d.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function windowMinutesOf(settings: CampaignAutomationSettings): number {
  return Math.max((settings.sendHourEnd - settings.sendHourStart) * 60, 60);
}

// Slots the index-th send of a day evenly across the campaign's send-hour
// window, plus a small random jitter — closer to how a human would space
// these out than firing them all at once.
function slotAtIndex(day: string, index: number, dailyLimit: number, settings: CampaignAutomationSettings): Date {
  const start = new Date(`${day}T${String(settings.sendHourStart).padStart(2, "0")}:00:00`);
  const windowMinutes = windowMinutesOf(settings);
  const step = Math.max(5, Math.floor(windowMinutes / Math.max(dailyLimit, 1)));
  const jitter = settings.randomDelayMinutes > 0 ? Math.floor(Math.random() * settings.randomDelayMinutes) : 0;
  start.setMinutes(start.getMinutes() + Math.min(step * index + jitter, windowMinutes - 1));
  return start;
}

// Nudges an arbitrary target time to the next working day (if it lands on
// a day off) and a random moment inside the send-hour window.
function scheduleWithinWorkingHours(target: Date, settings: CampaignAutomationSettings): Date {
  const day = nextWorkingDay(target, settings.workingDays);
  const windowMinutes = windowMinutesOf(settings);
  const jitter = settings.randomDelayMinutes > 0 ? Math.floor(Math.random() * settings.randomDelayMinutes) : 0;
  const minutesIntoWindow = Math.min(Math.floor(Math.random() * windowMinutes) + jitter, windowMinutes - 1);
  const scheduled = new Date(day);
  scheduled.setHours(settings.sendHourStart, 0, 0, 0);
  scheduled.setMinutes(scheduled.getMinutes() + minutesIntoWindow);
  return scheduled;
}

export async function enqueueConnectionRequests(params: {
  campaignId: string;
  connectionId: string;
  connectionNote: string;
  leads: Lead[];
  settings: CampaignAutomationSettings;
  connectionDailyLimit: number;
  connectionWeeklyLimit: number;
}): Promise<number> {
  const dailyLimit = Math.min(params.connectionDailyLimit, params.settings.dailyConnectionCap ?? Infinity);
  const weeklyLimit = Math.min(params.connectionWeeklyLimit, params.settings.weeklyConnectionCap ?? Infinity);

  const existing = await listActionsForConnection(params.connectionId);
  const perDayCount = new Map<string, number>();
  const perWeekCount = new Map<string, number>();
  for (const a of existing) {
    if (a.type !== "send_connection_request") continue;
    if (a.status === "failed" || a.status === "expired") continue;
    const day = a.scheduledAt.slice(0, 10);
    perDayCount.set(day, (perDayCount.get(day) ?? 0) + 1);
    const week = mondayOf(day);
    perWeekCount.set(week, (perWeekCount.get(week) ?? 0) + 1);
  }

  const actions: AutomationAction[] = [];
  const cursor = nextWorkingDay(new Date(), params.settings.workingDays);

  for (const lead of params.leads) {
    let day = cursor.toISOString().slice(0, 10);
    let week = mondayOf(day);
    let dayCount = perDayCount.get(day) ?? 0;
    let weekCount = perWeekCount.get(week) ?? 0;

    while (dayCount >= dailyLimit || weekCount >= weeklyLimit || !isWorkingDay(cursor, params.settings.workingDays)) {
      cursor.setDate(cursor.getDate() + 1);
      day = cursor.toISOString().slice(0, 10);
      const newWeek = mondayOf(day);
      if (newWeek !== week) {
        week = newWeek;
        weekCount = perWeekCount.get(week) ?? 0;
      }
      dayCount = perDayCount.get(day) ?? 0;
    }

    const scheduledAt = slotAtIndex(day, dayCount, dailyLimit, params.settings);
    perDayCount.set(day, dayCount + 1);
    perWeekCount.set(week, weekCount + 1);

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
  messages: CampaignMessageStep[];
  settings: CampaignAutomationSettings;
}): Promise<void> {
  const { action, messages, settings } = params;
  const lead = {
    firstName: action.leadFirstName,
    lastName: action.leadLastName,
    company: action.leadCompany,
  };

  const toCreate: AutomationAction[] = [];
  let cursor = new Date();

  messages.forEach((step, index) => {
    if (!step.text.trim()) return;
    if (index > 0) {
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + Math.max(step.delayDays, 1));
    }
    const scheduledAt = scheduleWithinWorkingHours(cursor, settings);
    cursor = scheduledAt;

    toCreate.push(
      newAction({
        campaignId: action.campaignId,
        connectionId: action.connectionId,
        leadLinkedinUrl: action.leadLinkedinUrl,
        leadFirstName: action.leadFirstName,
        leadLastName: action.leadLastName,
        leadCompany: action.leadCompany,
        type: "send_message",
        payload: { text: personalize(step.text, lead) },
        scheduledAt: scheduledAt.toISOString(),
      })
    );
  });

  await createActions(toCreate);
}
