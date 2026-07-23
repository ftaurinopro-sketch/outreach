import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { Lead, LeadList, LeadListSummary, LeadSourceType } from "./types";

// Same local-file-fallback pattern as src/lib/agents/store.ts — see that file
// for why.
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "lead-lists.json");

async function readLocalFile(): Promise<LeadList[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as LeadList[];
  } catch {
    return [];
  }
}

async function writeLocalFile(lists: LeadList[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(lists, null, 2), "utf-8");
}

type LeadListRow = {
  id: string;
  created_at: string;
  name: string;
  source_type: LeadSourceType;
  leads: Lead[];
};

function fromRow(row: LeadListRow): LeadList {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    sourceType: row.source_type,
    leads: row.leads,
  };
}

function toSummary(list: LeadList): LeadListSummary {
  return {
    id: list.id,
    createdAt: list.createdAt,
    name: list.name,
    sourceType: list.sourceType,
    leadCount: list.leads.length,
  };
}

export async function listLeadLists(): Promise<LeadListSummary[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("lead_lists")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as LeadListRow[]).map((row) => toSummary(fromRow(row)));
  }
  const lists = await readLocalFile();
  return [...lists]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSummary);
}

export async function getLeadList(id: string): Promise<LeadList | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("lead_lists")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as LeadListRow) : null;
  }
  const lists = await readLocalFile();
  return lists.find((l) => l.id === id) ?? null;
}

export async function createLeadList(
  name: string,
  sourceType: LeadSourceType,
  leads: Lead[]
): Promise<LeadList> {
  const list: LeadList = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    sourceType,
    leads,
  };

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("lead_lists").insert({
      id: list.id,
      created_at: list.createdAt,
      name: list.name,
      source_type: list.sourceType,
      leads: list.leads,
    });
    if (error) throw error;
    return list;
  }

  const lists = await readLocalFile();
  lists.push(list);
  await writeLocalFile(lists);
  return list;
}

// Used only by /api/extension/report-scrape: that request is authenticated
// via the connection's bearer token, not a Supabase session, so there's no
// auth.uid() for the user_id default to pick up — the caller must know
// which user owns the connection (looked up separately) and pass it here.
export async function createLeadListAsUser(
  userId: string,
  name: string,
  sourceType: LeadSourceType,
  leads: Lead[]
): Promise<LeadList> {
  const list: LeadList = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    sourceType,
    leads,
  };

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("lead_lists").insert({
      id: list.id,
      created_at: list.createdAt,
      name: list.name,
      source_type: list.sourceType,
      leads: list.leads,
      user_id: userId,
    });
    if (error) throw error;
    return list;
  }

  const lists = await readLocalFile();
  lists.push(list);
  await writeLocalFile(lists);
  return list;
}

export async function deleteLeadList(id: string): Promise<void> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("lead_lists").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const lists = await readLocalFile();
  await writeLocalFile(lists.filter((l) => l.id !== id));
}
