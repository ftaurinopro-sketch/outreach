// The central "what happens next" decision engine for sequence-mode
// campaigns — replaces the old scheduler.ts's hardcoded 2-phase pipeline
// with a generic interpreter over sequence_steps. Nothing in here talks to
// Playwright/LinkedIn directly (see src/lib/linkedin/provider.ts for that
// boundary) — this module only ever reads/writes campaign_prospects and
// activity_events and decides timing/state, matching the product principle
// that automation and UI/execution stay separate layers.
//
// Runs in the runner-triggered context (bearer token, no Supabase session),
// so every store call here goes through the service-role-scoped variants
// (*ForEngine / *ForExtension) — RLS's auth.uid() = user_id can never match
// in this context, same trust boundary automation_actions/scrape_jobs
// already established for the legacy scheduler.
import {
  getCampaignProspectForEngine,
  listCampaignProspectsForEngine,
  listDueCampaignProspectsForAccount,
  updateCampaignProspectForEngine,
} from "@/lib/campaignProspects/store";
import type { CampaignProspect } from "@/lib/campaignProspects/types";
import { listSequenceStepsForEngine } from "@/lib/sequences/store";
import type { SequenceStep } from "@/lib/sequences/types";
import {
  claimNextDueEvent,
  createActivityEvents,
  getActivityEvent,
  listActivityEventsForAccountSince,
  listActivityEventsForCampaignProspect,
  newActivityEvent,
  updateActivityEvent,
  cancelPendingEventsForCampaignProspect,
} from "@/lib/activity/store";
import type { ActivityEvent } from "@/lib/activity/types";
import { getConnectionForEngine } from "@/lib/connections/store";
import { getCampaignForExtension } from "@/lib/campaigns/store";
import {
  CONNECTION_STATUS_CHECK_INTERVAL_HOURS,
  MAX_CONNECTION_STATUS_CHECKS,
  type StepResult,
} from "./types";

// Called once, when a sequence-mode campaign is activated. Every prospect
// still in "new" gets its first due action scheduled — existing
// campaign_prospects that are already past "new" (shouldn't normally
// happen before first activation, but re-activating after a pause is a
// realistic future case) are left alone.
export async function initializeCampaignProspects(campaignId: string): Promise<number> {
  const steps = await listSequenceStepsForEngine(campaignId);
  if (steps.length === 0) return 0;

  const prospects = await listCampaignProspectsForEngine(campaignId);
  const firstStep = steps[0];
  const now = Date.now();
  let scheduled = 0;

  for (const cp of prospects) {
    if (cp.status !== "new") continue;
    const nextAt = new Date(now + firstStep.delayMinutes * 60 * 1000).toISOString();
    await updateCampaignProspectForEngine(cp.id, {
      status: "queued",
      currentStepPosition: 0,
      nextAction: firstStep.actionType,
      nextExecutionAt: nextAt,
    });
    scheduled++;
  }
  return scheduled;
}

// Rate-limit check mirroring the old scheduler's day/week cap logic
// (src/lib/automation/scheduler.ts enqueueConnectionRequests) — counts
// this week's already-created send_connection_request events for the
// account across ALL its sequence-mode campaigns (limits are per LinkedIn
// account, not per campaign), respecting the campaign's own tighter cap if
// one is set.
async function isConnectionRequestRateLimited(accountId: string, campaignId: string): Promise<boolean> {
  const connection = await getConnectionForEngine(accountId);
  const campaign = await getCampaignForExtension(campaignId);
  if (!connection) return true;

  const dailyLimit = Math.min(
    connection.dailyConnectionLimit,
    campaign?.automationSettings.dailyConnectionCap ?? Infinity
  );
  const weeklyLimit = Math.min(
    connection.weeklyConnectionLimit,
    campaign?.automationSettings.weeklyConnectionCap ?? Infinity
  );

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  const weekday = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (weekday === 0 ? 6 : weekday - 1));

  const weekEvents = await listActivityEventsForAccountSince(accountId, startOfWeek.toISOString());
  const dayCount = weekEvents.filter(
    (e) => e.actionType === "send_connection_request" && e.scheduledAt >= startOfDay.toISOString()
  ).length;
  const weekCount = weekEvents.filter((e) => e.actionType === "send_connection_request").length;

  return dayCount >= dailyLimit || weekCount >= weeklyLimit;
}

// The "tick": claims and materializes the next due activity_event for one
// LinkedIn account across all its sequence-mode campaigns. Idempotent by
// construction — it only ever creates ONE new activity_event per call, and
// a campaign_prospect already "in_progress" (its current event still
// pending/in_progress) is never picked again until that event resolves.
export async function scheduleNextDueAction(accountId: string): Promise<ActivityEvent | null> {
  const due = await listDueCampaignProspectsForAccount(accountId);
  if (due.length === 0) return null;

  for (const cp of due) {
    // Skip if there's already a pending/in_progress event for this
    // prospect — prevents double-scheduling if a previous tick created one
    // that hasn't been claimed/executed yet.
    const existing = await listActivityEventsForCampaignProspect(cp.id);
    if (existing.some((e) => e.status === "pending" || e.status === "in_progress")) continue;

    if (
      cp.nextAction === "send_connection_request" &&
      (await isConnectionRequestRateLimited(accountId, cp.campaignId))
    ) {
      continue; // try the next due prospect instead of blocking the whole tick
    }

    const steps = await listSequenceStepsForEngine(cp.campaignId);
    const step = steps[cp.currentStepPosition];
    if (!step) continue;

    const event = newActivityEvent({
      campaignId: cp.campaignId,
      prospectId: cp.prospectId,
      campaignProspectId: cp.id,
      stepId: cp.nextAction === step.actionType ? step.id : null,
      accountId,
      actionType: cp.nextAction ?? step.actionType,
      scheduledAt: cp.nextExecutionAt ?? new Date().toISOString(),
      metadata: {},
    });
    await createActivityEvents([event]);
    await updateCampaignProspectForEngine(cp.id, {
      status: "in_progress",
      lastActionAt: new Date().toISOString(),
    });
    return event;
  }

  return null;
}

// Runner-facing claim: marks the event scheduleNextDueAction just created
// as in_progress and hands it back, same claim-then-execute pattern
// automation/store.ts's claimNextAction already uses.
export async function claimDueEventForAccount(accountId: string): Promise<ActivityEvent | null> {
  const claimed = await claimNextDueEvent(accountId);
  if (claimed) return claimed;
  const scheduled = await scheduleNextDueAction(accountId);
  if (!scheduled) return null;
  return claimNextDueEvent(accountId);
}

// Called after the runner executes an activity_event and reports back —
// this is where state actually advances. Idempotent: an event already
// "done"/"failed"/"cancelled" (e.g. a duplicate report for the same event)
// is a no-op, so a retried report can never double-advance a prospect.
export async function reportActivityEventResult(eventId: string, result: StepResult): Promise<void> {
  const event = await getActivityEvent(eventId);
  if (!event || event.status === "done" || event.status === "failed" || event.status === "cancelled") return;

  await updateActivityEvent(eventId, {
    status: result.success ? "done" : "failed",
    executedAt: new Date().toISOString(),
    error: result.error ?? null,
  });

  const cp = await getCampaignProspectForEngine(event.campaignProspectId);
  if (!cp) return;
  const steps = await listSequenceStepsForEngine(event.campaignId);

  // check_reply is checked first regardless of what step we're on — a
  // reply detected at any point stops the rest of the sequence.
  if (event.actionType === "check_reply") {
    if (result.replied) {
      await stopForReply(cp);
    } else if (result.success) {
      await advanceToNextStep(cp, steps);
    }
    return;
  }

  if (event.actionType === "check_connection_status") {
    if (result.connected) {
      await updateCampaignProspectForEngine(cp.id, { status: "connected" });
      await advanceToNextStep(cp, steps);
    } else {
      await rescheduleConnectionStatusCheck(cp);
    }
    return;
  }

  const step = steps[cp.currentStepPosition];
  if (!step) return;

  if (!result.success && !step.conditions.skipIfFailed) {
    await updateCampaignProspectForEngine(cp.id, {
      status: "failed",
      nextAction: null,
      nextExecutionAt: null,
      stoppedReason: result.error ?? "Step failed",
    });
    return;
  }

  if (step.actionType === "send_connection_request" && result.success) {
    await updateCampaignProspectForEngine(cp.id, { status: "connection_sent" });
    await scheduleConnectionStatusCheck(cp, 0);
    return;
  }

  if (step.actionType === "send_message") {
    await updateCampaignProspectForEngine(cp.id, { status: "messaged" });
    if (step.conditions.ifReplied === "stop" || step.conditions.ifNoReply) {
      await scheduleReplyCheck(cp, steps);
      return;
    }
  }

  await advanceToNextStep(cp, steps);
}

async function stopForReply(cp: CampaignProspect): Promise<void> {
  await updateCampaignProspectForEngine(cp.id, {
    status: "replied",
    nextAction: null,
    nextExecutionAt: null,
    stoppedReason: "Prospect replied",
  });
  await cancelPendingEventsForCampaignProspect(cp.id);
}

async function scheduleConnectionStatusCheck(cp: CampaignProspect, attempt: number): Promise<void> {
  if (attempt >= MAX_CONNECTION_STATUS_CHECKS) {
    await updateCampaignProspectForEngine(cp.id, {
      status: "failed",
      nextAction: null,
      nextExecutionAt: null,
      stoppedReason: "Connection request never accepted",
    });
    return;
  }
  const nextAt = new Date(Date.now() + CONNECTION_STATUS_CHECK_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
  await updateCampaignProspectForEngine(cp.id, { nextAction: "check_connection_status", nextExecutionAt: nextAt });
}

async function rescheduleConnectionStatusCheck(cp: CampaignProspect): Promise<void> {
  const events = await listActivityEventsForCampaignProspect(cp.id);
  const attempts = events.filter((e) => e.actionType === "check_connection_status").length;
  await scheduleConnectionStatusCheck(cp, attempts);
}

// Deliberately does NOT touch currentStepPosition — it stays pointed at
// the message step that just sent, with "check_reply" as a gate in front
// of whatever comes next. When the check later resolves with no reply,
// advanceToNextStep(cp, steps) computes currentStepPosition + 1 itself and
// lands correctly on the real next step (or "completed" if there isn't
// one) — advancing position here too, ahead of time, would make that
// later +1 skip a step entirely. Caught by an end-to-end engine test
// before this shipped (a 2-step sequence's ifReplied:'stop' guard on the
// final message was skipping straight to "completed" without ever
// actually checking for a reply).
async function scheduleReplyCheck(cp: CampaignProspect, steps: SequenceStep[]): Promise<void> {
  const nextStep = steps[cp.currentStepPosition + 1];
  // If there's a next scripted step, check shortly before it would fire
  // (never let a follow-up land on top of a conversation the lead already
  // started). If this was the last step, still check once — a reply that
  // arrives after the sequence "finishes" should still be recorded as
  // REPLIED rather than silently staying COMPLETED — after a day, same
  // as the connection-status recheck cadence.
  const checkDelayMinutes = nextStep
    ? Math.max(nextStep.delayMinutes - 5, 1)
    : CONNECTION_STATUS_CHECK_INTERVAL_HOURS * 60;
  const nextAt = new Date(Date.now() + checkDelayMinutes * 60 * 1000).toISOString();
  await updateCampaignProspectForEngine(cp.id, {
    nextAction: "check_reply",
    nextExecutionAt: nextAt,
  });
}

async function advanceToNextStep(cp: CampaignProspect, steps: SequenceStep[]): Promise<void> {
  const nextIndex = cp.currentStepPosition + 1;
  const nextStep = steps[nextIndex];
  if (!nextStep) {
    await updateCampaignProspectForEngine(cp.id, { status: "completed", nextAction: null, nextExecutionAt: null });
    return;
  }
  const nextAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000).toISOString();
  await updateCampaignProspectForEngine(cp.id, {
    currentStepPosition: nextIndex,
    nextAction: nextStep.actionType,
    nextExecutionAt: nextAt,
  });
}
