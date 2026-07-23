import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { ScrapeJob, ScrapeJobStatus, ScrapeSourceType } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "scrape-jobs.json");

async function readLocalFile(): Promise<ScrapeJob[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ScrapeJob[];
  } catch {
    return [];
  }
}

async function writeLocalFile(jobs: ScrapeJob[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

type ScrapeJobRow = {
  id: string;
  created_at: string;
  user_id: string;
  connection_id: string;
  list_name: string;
  search_url: string;
  source_type: ScrapeSourceType;
  status: ScrapeJobStatus;
  result_list_id: string | null;
  result_count: number | null;
  error: string | null;
};

function fromRow(row: ScrapeJobRow): ScrapeJob {
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    connectionId: row.connection_id,
    listName: row.list_name,
    searchUrl: row.search_url,
    sourceType: row.source_type,
    status: row.status,
    resultListId: row.result_list_id,
    resultCount: row.result_count,
    error: row.error,
  };
}

// scrape_jobs has no RLS policy (see supabase/migrations/0007_*.sql), so
// this always runs through the admin client — filtering by user_id has to
// happen here in application code instead.
export async function listScrapeJobs(userId: string): Promise<ScrapeJob[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ScrapeJobRow[]).map(fromRow);
  }
  const jobs = await readLocalFile();
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getScrapeJob(id: string): Promise<ScrapeJob | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("scrape_jobs").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ScrapeJobRow) : null;
  }
  const jobs = await readLocalFile();
  return jobs.find((j) => j.id === id) ?? null;
}

export async function createScrapeJob(input: {
  userId: string;
  connectionId: string;
  listName: string;
  searchUrl: string;
  sourceType: ScrapeSourceType;
}): Promise<ScrapeJob> {
  const job: ScrapeJob = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    userId: input.userId,
    connectionId: input.connectionId,
    listName: input.listName,
    searchUrl: input.searchUrl,
    sourceType: input.sourceType,
    status: "pending",
    resultListId: null,
    resultCount: null,
    error: null,
  };

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("scrape_jobs").insert({
      id: job.id,
      created_at: job.createdAt,
      user_id: job.userId,
      connection_id: job.connectionId,
      list_name: job.listName,
      search_url: job.searchUrl,
      source_type: job.sourceType,
      status: job.status,
      result_list_id: null,
      result_count: null,
      error: null,
    });
    if (error) throw error;
    return job;
  }

  const jobs = await readLocalFile();
  jobs.push(job);
  await writeLocalFile(jobs);
  return job;
}

// Claims the oldest pending job for a connection (same "not a real DB lock,
// good enough for one runner" caveat as automation actions — see
// src/lib/automation/store.ts).
export async function claimNextScrapeJob(connectionId: string): Promise<ScrapeJob | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: updated, error: updateError } = await supabase
      .from("scrape_jobs")
      .update({ status: "in_progress" })
      .eq("id", (data as ScrapeJobRow).id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return updated ? fromRow(updated as ScrapeJobRow) : null;
  }

  const jobs = await readLocalFile();
  const next = jobs
    .filter((j) => j.connectionId === connectionId && j.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!next) return null;
  next.status = "in_progress";
  await writeLocalFile(jobs);
  return next;
}

export async function completeScrapeJob(
  id: string,
  patch: { resultListId: string; resultCount: number }
): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("scrape_jobs")
      .update({ status: "done", result_list_id: patch.resultListId, result_count: patch.resultCount })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const jobs = await readLocalFile();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx !== -1) {
    jobs[idx].status = "done";
    jobs[idx].resultListId = patch.resultListId;
    jobs[idx].resultCount = patch.resultCount;
    await writeLocalFile(jobs);
  }
}

export async function failScrapeJob(id: string, error: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error: dbError } = await supabase
      .from("scrape_jobs")
      .update({ status: "failed", error })
      .eq("id", id);
    if (dbError) throw dbError;
    return;
  }
  const jobs = await readLocalFile();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx !== -1) {
    jobs[idx].status = "failed";
    jobs[idx].error = error;
    await writeLocalFile(jobs);
  }
}
