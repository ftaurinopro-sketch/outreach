import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { ActivityEvent, ActivityEventStatus, NewActivityEvent } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "activity-events.json");

async function readLocalFile(): Promise<ActivityEvent[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
  }
}

async function writeLocalFile(events: ActivityEvent[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), "utf-8");
}

type ActivityEventRow = {
  id: string;
  created_at: string;
  campaign_id: string;
  prospect_id: string;
  campaign_prospect_id: string;
  step_id: string | null;
  account_id: string | null;
  action_type: string;
  status: ActivityEventStatus;
  scheduled_at: string;
  executed_at: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  attempts: number;
};

function fromRow(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    campaignProspectId: row.campaign_prospect_id,
    stepId: row.step_id,
    accountId: row.account_id,
    actionType: row.action_type,
    status: row.status,
    scheduledAt: row.scheduled_at,
    executedAt: row.executed_at,
    error: row.error,
    metadata: row.metadata ?? {},
    attempts: row.attempts,
  };
}

function toRow(event: ActivityEvent): ActivityEventRow {
  return {
    id: event.id,
    created_at: event.createdAt,
    campaign_id: event.campaignId,
    prospect_id: event.prospectId,
    campaign_prospect_id: event.campaignProspectId,
    step_id: event.stepId,
    account_id: event.accountId,
    action_type: event.actionType,
    status: event.status,
    scheduled_at: event.scheduledAt,
    executed_at: event.executedAt,
    error: event.error,
    metadata: event.metadata,
    attempts: event.attempts,
  };
}

export function newActivityEvent(base: NewActivityEvent): ActivityEvent {
  return {
    ...base,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    executedAt: null,
    error: null,
    attempts: 0,
  };
}

export async function createActivityEvents(events: ActivityEvent[]): Promise<void> {
  if (events.length === 0) return;
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("activity_events").insert(events.map(toRow));
    if (error) throw error;
    return;
  }
  const existing = await readLocalFile();
  await writeLocalFile([...existing, ...events]);
}

export async function listActivityEventsForCampaign(campaignId: string): Promise<ActivityEvent[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("activity_events")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data as ActivityEventRow[]).map(fromRow);
  }
  const events = await readLocalFile();
  return events
    .filter((e) => e.campaignId === campaignId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function listActivityEventsForCampaignProspect(
  campaignProspectId: string
): Promise<ActivityEvent[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("activity_events")
      .select("*")
      .eq("campaign_prospect_id", campaignProspectId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data as ActivityEventRow[]).map(fromRow);
  }
  const events = await readLocalFile();
  return events
    .filter((e) => e.campaignProspectId === campaignProspectId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

// Claims the earliest due, pending event for an account (status pending,
// scheduledAt <= now) and marks it in_progress — same not-a-real-DB-lock
// caveat as automation/store.ts's claimNextAction, good enough for one
// runner instance polling a personal account.
export async function claimNextDueEvent(accountId: string): Promise<ActivityEvent | null> {
  const now = new Date().toISOString();

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("activity_events")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const candidate = data as ActivityEventRow;
    const { data: updated, error: updateError } = await supabase
      .from("activity_events")
      .update({ status: "in_progress", attempts: candidate.attempts + 1 })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return updated ? fromRow(updated as ActivityEventRow) : null;
  }

  const events = await readLocalFile();
  const due = events
    .filter((e) => e.accountId === accountId && e.status === "pending" && e.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const next = due[0];
  if (!next) return null;
  next.status = "in_progress";
  next.attempts += 1;
  await writeLocalFile(events);
  return next;
}

export async function updateActivityEvent(
  id: string,
  patch: Partial<Pick<ActivityEvent, "status" | "executedAt" | "error" | "metadata">>
): Promise<ActivityEvent | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.executedAt !== undefined) row.executed_at = patch.executedAt;
    if (patch.error !== undefined) row.error = patch.error;
    if (patch.metadata !== undefined) row.metadata = patch.metadata;

    const { data, error } = await supabase
      .from("activity_events")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ActivityEventRow) : null;
  }

  const events = await readLocalFile();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  events[idx] = { ...events[idx], ...patch };
  await writeLocalFile(events);
  return events[idx];
}

// Called when a prospect stops (reply detected, opted out, etc.) — cancels
// their remaining not-yet-executed steps so the engine never fires them.
export async function cancelPendingEventsForCampaignProspect(campaignProspectId: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("activity_events")
      .update({ status: "cancelled" })
      .eq("campaign_prospect_id", campaignProspectId)
      .in("status", ["pending", "in_progress"]);
    if (error) throw error;
    return;
  }
  const events = await readLocalFile();
  for (const e of events) {
    if (e.campaignProspectId === campaignProspectId && (e.status === "pending" || e.status === "in_progress")) {
      e.status = "cancelled";
    }
  }
  await writeLocalFile(events);
}
