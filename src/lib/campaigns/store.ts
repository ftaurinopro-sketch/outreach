import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { Campaign, CampaignInput, CampaignStatus } from "./types";

// Same local-file-fallback pattern as the agents/leads stores — see
// src/lib/agents/store.ts for the rationale.
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "campaigns.json");

async function readLocalFile(): Promise<Campaign[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Campaign[];
  } catch {
    return [];
  }
}

async function writeLocalFile(campaigns: Campaign[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(campaigns, null, 2), "utf-8");
}

type CampaignRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: CampaignStatus;
  connection_id: string | null;
  activated_at: string | null;
  config: CampaignInput;
};

function fromRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    connectionId: row.connection_id,
    activatedAt: row.activated_at,
    ...row.config,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as CampaignRow[]).map(fromRow);
  }
  const campaigns = await readLocalFile();
  return [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as CampaignRow) : null;
  }
  const campaigns = await readLocalFile();
  return campaigns.find((c) => c.id === id) ?? null;
}

// Used only by /api/extension/report route: authenticated via the
// connection's bearer token (no Supabase session), so the user-scoped
// client can't be used here. Read-only lookup of message templates to
// build a reply — the campaignId comes from our own automation_actions
// row, not user input, so this doesn't need an extra ownership check.
export async function getCampaignForExtension(id: string): Promise<Campaign | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as CampaignRow) : null;
  }
  const campaigns = await readLocalFile();
  return campaigns.find((c) => c.id === id) ?? null;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    connectionId: null,
    activatedAt: null,
    ...input,
  };

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("campaigns").insert({
      id: campaign.id,
      created_at: campaign.createdAt,
      updated_at: campaign.updatedAt,
      status: campaign.status,
      connection_id: null,
      activated_at: null,
      config: input,
    });
    if (error) throw error;
    return campaign;
  }

  const campaigns = await readLocalFile();
  campaigns.push(campaign);
  await writeLocalFile(campaigns);
  return campaign;
}

export async function activateCampaign(id: string, connectionId: string): Promise<Campaign> {
  const now = new Date().toISOString();

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .update({ status: "active", connection_id: connectionId, activated_at: now, updated_at: now })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Campagna non trovata");
    return fromRow(data as CampaignRow);
  }

  const campaigns = await readLocalFile();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Campagna non trovata");
  campaigns[idx] = {
    ...campaigns[idx],
    status: "active",
    connectionId,
    activatedAt: now,
    updatedAt: now,
  };
  await writeLocalFile(campaigns);
  return campaigns[idx];
}

export async function deleteCampaign(id: string): Promise<void> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const campaigns = await readLocalFile();
  await writeLocalFile(campaigns.filter((c) => c.id !== id));
}
