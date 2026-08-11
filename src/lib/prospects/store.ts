import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig, getCurrentUserId } from "@/lib/supabase/user";
import type { Prospect, ProspectInput } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "prospects.json");

type LocalProspect = Prospect & { userId: string };

async function readLocalFile(): Promise<LocalProspect[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as LocalProspect[];
  } catch {
    return [];
  }
}

async function writeLocalFile(prospects: LocalProspect[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(prospects, null, 2), "utf-8");
}

type ProspectRow = {
  id: string;
  created_at: string;
  updated_at: string;
  linkedin_url: string;
  first_name: string;
  last_name: string;
  headline: string;
  company: string;
  position: string;
  location: string;
  industry: string;
  email: string;
  notes: string;
  tags: string[];
  custom_fields: Record<string, string>;
  source: Prospect["source"];
  score: number | null;
  fit_category: Prospect["fitCategory"];
  seniority: string | null;
  signals: string | null;
  score_reasoning: string | null;
  scored_at: string | null;
  scored_by_agent_id: string | null;
};

function fromRow(row: ProspectRow): Prospect {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedinUrl: row.linkedin_url,
    firstName: row.first_name,
    lastName: row.last_name,
    headline: row.headline,
    company: row.company,
    position: row.position,
    location: row.location,
    industry: row.industry,
    email: row.email,
    notes: row.notes,
    tags: row.tags ?? [],
    customFields: row.custom_fields ?? {},
    source: row.source,
    score: row.score,
    fitCategory: row.fit_category,
    seniority: row.seniority,
    signals: row.signals,
    scoreReasoning: row.score_reasoning,
    scoredAt: row.scored_at,
    scoredByAgentId: row.scored_by_agent_id,
  };
}

function inputToRow(input: ProspectInput) {
  return {
    linkedin_url: input.linkedinUrl,
    first_name: input.firstName ?? "",
    last_name: input.lastName ?? "",
    headline: input.headline ?? "",
    company: input.company ?? "",
    position: input.position ?? "",
    location: input.location ?? "",
    industry: input.industry ?? "",
    email: input.email ?? "",
    notes: input.notes ?? "",
    tags: input.tags ?? [],
    custom_fields: input.customFields ?? {},
    source: input.source,
  };
}

export async function listProspects(): Promise<Prospect[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ProspectRow[]).map(fromRow);
  }
  const userId = await getCurrentUserId();
  const prospects = await readLocalFile();
  return prospects
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProspect(id: string): Promise<Prospect | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ProspectRow) : null;
  }
  const prospects = await readLocalFile();
  return prospects.find((p) => p.id === id) ?? null;
}

export async function getProspectsByIds(ids: string[]): Promise<Prospect[]> {
  if (ids.length === 0) return [];
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase.from("prospects").select("*").in("id", ids);
    if (error) throw error;
    return (data as ProspectRow[]).map(fromRow);
  }
  const prospects = await readLocalFile();
  const idSet = new Set(ids);
  return prospects.filter((p) => idSet.has(p.id));
}

// The dedup entry point: every CSV row, scraped search result, or manual
// add goes through here instead of a plain insert. Matches on
// (user, linkedinUrl) — the DB-level UNIQUE constraint backs this up, but
// we upsert explicitly (rather than relying on a 409) so a re-import that
// finds newer data (e.g. an updated headline) merges it onto the existing
// prospect instead of failing or creating a duplicate.
export async function upsertProspects(inputs: ProspectInput[]): Promise<Prospect[]> {
  if (inputs.length === 0) return [];

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const rows = inputs.map(inputToRow);
    const { data, error } = await supabase
      .from("prospects")
      .upsert(rows, { onConflict: "user_id,linkedin_url" })
      .select("*");
    if (error) throw error;
    return (data as ProspectRow[]).map(fromRow);
  }

  const userId = await getCurrentUserId();
  const prospects = await readLocalFile();
  const byUrl = new Map(
    prospects.filter((p) => p.userId === userId).map((p) => [p.linkedinUrl, p] as const)
  );
  const now = new Date().toISOString();
  const results: LocalProspect[] = [];

  for (const input of inputs) {
    const existing = byUrl.get(input.linkedinUrl);
    if (existing) {
      const updated: LocalProspect = {
        ...existing,
        firstName: input.firstName || existing.firstName,
        lastName: input.lastName || existing.lastName,
        headline: input.headline || existing.headline,
        company: input.company || existing.company,
        position: input.position || existing.position,
        location: input.location || existing.location,
        industry: input.industry || existing.industry,
        email: input.email || existing.email,
        customFields: { ...existing.customFields, ...(input.customFields ?? {}) },
        updatedAt: now,
      };
      const idx = prospects.findIndex((p) => p.id === existing.id);
      prospects[idx] = updated;
      byUrl.set(input.linkedinUrl, updated);
      results.push(updated);
    } else {
      const created: LocalProspect = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        userId,
        linkedinUrl: input.linkedinUrl,
        firstName: input.firstName ?? "",
        lastName: input.lastName ?? "",
        headline: input.headline ?? "",
        company: input.company ?? "",
        position: input.position ?? "",
        location: input.location ?? "",
        industry: input.industry ?? "",
        email: input.email ?? "",
        notes: input.notes ?? "",
        tags: input.tags ?? [],
        customFields: input.customFields ?? {},
        source: input.source,
        score: null,
        fitCategory: null,
        seniority: null,
        signals: null,
        scoreReasoning: null,
        scoredAt: null,
        scoredByAgentId: null,
      };
      prospects.push(created);
      byUrl.set(input.linkedinUrl, created);
      results.push(created);
    }
  }

  await writeLocalFile(prospects);
  return results;
}

export async function updateProspectScore(
  id: string,
  score: {
    score: number;
    fitCategory: Prospect["fitCategory"];
    seniority: string;
    signals: string;
    scoreReasoning: string;
    scoredByAgentId: string;
  }
): Promise<void> {
  const scoredAt = new Date().toISOString();
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase
      .from("prospects")
      .update({
        score: score.score,
        fit_category: score.fitCategory,
        seniority: score.seniority,
        signals: score.signals,
        score_reasoning: score.scoreReasoning,
        scored_at: scoredAt,
        scored_by_agent_id: score.scoredByAgentId,
      })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const prospects = await readLocalFile();
  const idx = prospects.findIndex((p) => p.id === id);
  if (idx === -1) return;
  prospects[idx] = {
    ...prospects[idx],
    score: score.score,
    fitCategory: score.fitCategory,
    seniority: score.seniority,
    signals: score.signals,
    scoreReasoning: score.scoreReasoning,
    scoredAt,
    scoredByAgentId: score.scoredByAgentId,
  };
  await writeLocalFile(prospects);
}

export async function deleteProspect(id: string): Promise<void> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const prospects = await readLocalFile();
  await writeLocalFile(prospects.filter((p) => p.id !== id));
}
