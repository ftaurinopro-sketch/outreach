import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
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

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("automation_actions")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: updated, error: updateError } = await supabase
      .from("automation_actions")
      .update({ status: "in_progress", attempts: (data as ActionRow).attempts + 1 })
      .eq("id", (data as ActionRow).id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return updated ? fromRow(updated as ActionRow) : null;
  }

  const actions = await readLocalFile();
  const due = actions
    .filter((a) => a.connectionId === connectionId && a.status === "pending" && a.scheduledAt <= now)
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
  patch: Partial<Pick<AutomationAction, "status" | "lastError" | "scheduledAt" | "checkCount">>
): Promise<AutomationAction | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.lastError !== undefined) row.last_error = patch.lastError;
    if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
    if (patch.checkCount !== undefined) row.check_count = patch.checkCount;

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
