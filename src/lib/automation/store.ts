import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { listPausedCampaignIdsForConnection } from "@/lib/campaigns/store";
import type { ActionStatus, AutomationAction } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "automation-actions.json");

async function readLocalFile(): Promise<AutomationAction[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as AutomationAction[];
  } catch {
    return [];
  }
}

async function writeLocalFile(actions: AutomationAction[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(actions, null, 2), "utf-8");
}

type ActionRow = {
  id: string;
  created_at: string;
  campaign_id: string;
  connection_id: string;
  lead_linkedin_url: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_company: string;
  lead_position: string;
  lead_location: string;
  lead_industry: string;
  lead_custom_fields: Record<string, string>;
  type: AutomationAction["type"];
  payload: AutomationAction["payload"];
  status: ActionStatus;
  scheduled_at: string;
  attempts: number;
  last_error: string | null;
  check_count: number;
};

function fromRow(row: ActionRow): AutomationAction {
  return {
    id: row.id,
    createdAt: row.created_at,
    campaignId: row.campaign_id,
    connectionId: row.connection_id,
    leadLinkedinUrl: row.lead_linkedin_url,
    leadFirstName: row.lead_first_name,
    leadLastName: row.lead_last_name,
    leadCompany: row.lead_company,
    leadPosition: row.lead_position,
    leadLocation: row.lead_location,
    leadIndustry: row.lead_industry,
    leadCustomFields: row.lead_custom_fields ?? {},
    type: row.type,
    payload: row.payload,
    status: row.status,
    scheduledAt: row.scheduled_at,
    attempts: row.attempts,
    lastError: row.last_error,
    checkCount: row.check_count,
  };
}

function toRow(action: AutomationAction): ActionRow {
  return {
    id: action.id,
    created_at: action.createdAt,
    campaign_id: action.campaignId,
    connection_id: action.connectionId,
    lead_linkedin_url: action.leadLinkedinUrl,
    lead_first_name: action.leadFirstName,
    lead_last_name: action.leadLastName,
    lead_company: action.leadCompany,
    lead_position: action.leadPosition,
    lead_location: action.leadLocation,
    lead_industry: action.leadIndustry,
    lead_custom_fields: action.leadCustomFields,
    type: action.type,
    payload: action.payload,
    status: action.status,
    scheduled_at: action.scheduledAt,
    attempts: action.attempts,
    last_error: action.lastError,
    check_count: action.checkCount,
  };
}

export async function listActionsForCampaign(campaignId: string): Promise<AutomationAction[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data as ActionRow[]).map(fromRow);
  }
  const actions = await readLocalFile();
  return actions
    .filter((a) => a.campaignId === campaignId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

// Batched form of listActionsForCampaign — for callers (dashboard metrics)
// that need actions for many campaigns at once, this is one query instead
// of one round trip per campaign.
export async function listActionsForCampaigns(
  campaignIds: string[]
): Promise<Map<string, AutomationAction[]>> {
  const byCampaign = new Map<string, AutomationAction[]>();
  if (campaignIds.length === 0) return byCampaign;

  let actions: AutomationAction[];
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    actions = (data as ActionRow[]).map(fromRow);
  } else {
    const all = await readLocalFile();
    const idSet = new Set(campaignIds);
    actions = all
      .filter((a) => idSet.has(a.campaignId))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  for (const action of actions) {
    const list = byCampaign.get(action.campaignId);
    if (list) list.push(action);
    else byCampaign.set(action.campaignId, [action]);
  }
  return byCampaign;
}

export async function listActionsForConnection(connectionId: string): Promise<AutomationAction[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .eq("connection_id", connectionId);
    if (error) throw error;
    return (data as ActionRow[]).map(fromRow);
  }
  const actions = await readLocalFile();
  return actions.filter((a) => a.connectionId === connectionId);
}

export async function createActions(actions: AutomationAction[]): Promise<void> {
  if (actions.length === 0) return;

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("automation_actions").insert(actions.map(toRow));
    if (error) throw error;
    return;
  }

  const existing = await readLocalFile();
  await writeLocalFile([...existing, ...actions]);
}

export function newAction(
  base: Omit<AutomationAction, "id" | "createdAt" | "status" | "attempts" | "lastError" | "checkCount">
): AutomationAction {
  return {
    ...base,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    lastError: null,
    checkCount: 0,
  };
}

// Claims the earliest due action for a connection (status pending, scheduledAt
// <= now) and marks it in_progress, so two overlapping polls never grab the
// same action. Not a real DB-level lock, but good enough for a single
// extension instance polling a personal account.
export async function claimNextAction(connectionId: string): Promise<AutomationAction | null> {
  const now = new Date().toISOString();
  const pausedCampaignIds = await listPausedCampaignIdsForConnection(connectionId);

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    // Fetch a small batch of due candidates rather than just one, since the
    // single earliest-due action might belong to a paused campaign.
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(20);
    if (error) throw error;
    const candidate = (data as ActionRow[]).find((a) => !pausedCampaignIds.has(a.campaign_id));
    if (!candidate) return null;

    const { data: updated, error: updateError } = await supabase
      .from("automation_actions")
      .update({ status: "in_progress", attempts: candidate.attempts + 1 })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return updated ? fromRow(updated as ActionRow) : null;
  }

  const actions = await readLocalFile();
  const due = actions
    .filter(
      (a) =>
        a.connectionId === connectionId &&
        a.status === "pending" &&
        a.scheduledAt <= now &&
        !pausedCampaignIds.has(a.campaignId)
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const next = due[0];
  if (!next) return null;

  next.status = "in_progress";
  next.attempts += 1;
  await writeLocalFile(actions);
  return next;
}

export async function updateAction(
  id: string,
  patch: Partial<Pick<AutomationAction, "status" | "lastError" | "scheduledAt" | "checkCount" | "payload">>
): Promise<AutomationAction | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.lastError !== undefined) row.last_error = patch.lastError;
    if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
    if (patch.checkCount !== undefined) row.check_count = patch.checkCount;
    if (patch.payload !== undefined) row.payload = patch.payload;

    const { data, error } = await supabase
      .from("automation_actions")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ActionRow) : null;
  }

  const actions = await readLocalFile();
  const idx = actions.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  actions[idx] = { ...actions[idx], ...patch };
  await writeLocalFile(actions);
  return actions[idx];
}

export async function getAction(id: string): Promise<AutomationAction | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ActionRow) : null;
  }
  const actions = await readLocalFile();
  return actions.find((a) => a.id === id) ?? null;
}

// Called once a "check_reply" action detects the lead has replied: stops the
// rest of that lead's sequence in this campaign rather than sending a
// canned follow-up on top of a live conversation.
export async function cancelPendingMessagesForLead(
  campaignId: string,
  leadLinkedinUrl: string
): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("automation_actions")
      .update({ status: "cancelled" })
      .eq("campaign_id", campaignId)
      .eq("lead_linkedin_url", leadLinkedinUrl)
      .in("type", ["send_message", "check_reply"])
      .in("status", ["pending", "in_progress"]);
    if (error) throw error;
    return;
  }

  const actions = await readLocalFile();
  for (const a of actions) {
    if (
      a.campaignId === campaignId &&
      a.leadLinkedinUrl === leadLinkedinUrl &&
      (a.type === "send_message" || a.type === "check_reply") &&
      (a.status === "pending" || a.status === "in_progress")
    ) {
      a.status = "cancelled";
    }
  }
  await writeLocalFile(actions);
}
