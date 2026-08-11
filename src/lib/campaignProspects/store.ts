import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { getCampaign } from "@/lib/campaigns/store";
import type { CampaignProspect, CampaignProspectOverlap, CampaignProspectStatus } from "./types";
import { TERMINAL_STATUSES } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "campaign-prospects.json");

async function readLocalFile(): Promise<CampaignProspect[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as CampaignProspect[];
  } catch {
    return [];
  }
}

async function writeLocalFile(rows: CampaignProspect[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf-8");
}

type CampaignProspectRow = {
  id: string;
  campaign_id: string;
  prospect_id: string;
  status: CampaignProspectStatus;
  current_step_position: number;
  next_action: string | null;
  next_execution_at: string | null;
  last_action_at: string | null;
  stopped_reason: string | null;
  added_at: string;
};

function fromRow(row: CampaignProspectRow): CampaignProspect {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    status: row.status,
    currentStepPosition: row.current_step_position,
    nextAction: row.next_action,
    nextExecutionAt: row.next_execution_at,
    lastActionAt: row.last_action_at,
    stoppedReason: row.stopped_reason,
    addedAt: row.added_at,
  };
}

export async function listCampaignProspects(campaignId: string): Promise<CampaignProspect[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaign_prospects")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("added_at", { ascending: false });
    if (error) throw error;
    return (data as CampaignProspectRow[]).map(fromRow);
  }
  const rows = await readLocalFile();
  return rows
    .filter((r) => r.campaignId === campaignId)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

// Before enrolling prospects in a campaign, surface anyone already
// non-terminally active in a *different* campaign — the UI shows this as a
// warning the user can override, not a hard block (matches the product
// spec: "show a clear warning when appropriate", not "silently prevent").
export async function findActiveOverlaps(
  prospectIds: string[],
  excludingCampaignId?: string
): Promise<CampaignProspectOverlap[]> {
  if (prospectIds.length === 0) return [];

  let rows: CampaignProspect[];
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaign_prospects")
      .select("*")
      .in("prospect_id", prospectIds)
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`);
    if (error) throw error;
    rows = (data as CampaignProspectRow[]).map(fromRow);
  } else {
    const all = await readLocalFile();
    rows = all.filter(
      (r) => prospectIds.includes(r.prospectId) && !TERMINAL_STATUSES.includes(r.status)
    );
  }

  if (excludingCampaignId) rows = rows.filter((r) => r.campaignId !== excludingCampaignId);
  if (rows.length === 0) return [];

  const campaignIds = [...new Set(rows.map((r) => r.campaignId))];
  const campaigns = await Promise.all(campaignIds.map((id) => getCampaign(id)));
  const nameById = new Map(campaigns.filter(Boolean).map((c) => [c!.id, c!.name] as const));

  return rows.map((r) => ({
    prospectId: r.prospectId,
    campaignId: r.campaignId,
    campaignName: nameById.get(r.campaignId) ?? "—",
    status: r.status,
  }));
}

// Enrolls each prospect not already in this campaign (the UNIQUE
// (campaign_id, prospect_id) constraint is the backstop; this pre-filters
// so a repeated "add" call is a harmless no-op rather than an upsert that
// could reset an in-progress prospect back to "new"). Returns only the
// newly created rows.
export async function addProspectsToCampaign(
  campaignId: string,
  prospectIds: string[]
): Promise<CampaignProspect[]> {
  if (prospectIds.length === 0) return [];
  const existing = await listCampaignProspects(campaignId);
  const existingIds = new Set(existing.map((r) => r.prospectId));
  const toAdd = prospectIds.filter((id) => !existingIds.has(id));
  if (toAdd.length === 0) return [];

  const now = new Date().toISOString();
  const rows: CampaignProspect[] = toAdd.map((prospectId) => ({
    id: randomUUID(),
    campaignId,
    prospectId,
    status: "new",
    currentStepPosition: 0,
    nextAction: null,
    nextExecutionAt: null,
    lastActionAt: null,
    stoppedReason: null,
    addedAt: now,
  }));

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaign_prospects")
      .insert(
        rows.map((r) => ({
          id: r.id,
          campaign_id: r.campaignId,
          prospect_id: r.prospectId,
          status: r.status,
          current_step_position: r.currentStepPosition,
          next_action: r.nextAction,
          next_execution_at: r.nextExecutionAt,
          last_action_at: r.lastActionAt,
          stopped_reason: r.stoppedReason,
          added_at: r.addedAt,
        }))
      )
      .select("*");
    if (error) throw error;
    return (data as CampaignProspectRow[]).map(fromRow);
  }

  const all = await readLocalFile();
  await writeLocalFile([...all, ...rows]);
  return rows;
}

export async function updateCampaignProspect(
  id: string,
  patch: Partial<
    Pick<
      CampaignProspect,
      "status" | "currentStepPosition" | "nextAction" | "nextExecutionAt" | "lastActionAt" | "stoppedReason"
    >
  >
): Promise<CampaignProspect | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.currentStepPosition !== undefined) row.current_step_position = patch.currentStepPosition;
    if (patch.nextAction !== undefined) row.next_action = patch.nextAction;
    if (patch.nextExecutionAt !== undefined) row.next_execution_at = patch.nextExecutionAt;
    if (patch.lastActionAt !== undefined) row.last_action_at = patch.lastActionAt;
    if (patch.stoppedReason !== undefined) row.stopped_reason = patch.stoppedReason;

    const { data, error } = await supabase
      .from("campaign_prospects")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as CampaignProspectRow) : null;
  }

  const all = await readLocalFile();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeLocalFile(all);
  return all[idx];
}

// Automatic stop-for-this-prospect — the persisted equivalent of the old
// system's cancelPendingMessagesForLead, but as a real state write instead
// of only cancelling queued action rows.
export async function stopCampaignProspect(
  id: string,
  status: Extract<CampaignProspectStatus, "replied" | "completed" | "failed" | "opted_out">,
  reason: string
): Promise<void> {
  await updateCampaignProspect(id, {
    status,
    nextAction: null,
    nextExecutionAt: null,
    stoppedReason: reason,
  });
}
