import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { LoginAttempt, LoginAttemptInteraction, LoginAttemptStatus } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "login-attempts.json");

async function readLocalFile(): Promise<LoginAttempt[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as LoginAttempt[];
  } catch {
    return [];
  }
}

async function writeLocalFile(attempts: LoginAttempt[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(attempts, null, 2), "utf-8");
}

type LoginAttemptRow = {
  id: string;
  connection_id: string;
  created_at: string;
  updated_at: string;
  status: LoginAttemptStatus;
  verification_prompt: string | null;
  verification_code: string | null;
  error: string | null;
  screenshot: string | null;
  pending_interaction: LoginAttemptInteraction | null;
};

function fromRow(row: LoginAttemptRow): LoginAttempt {
  return {
    id: row.id,
    connectionId: row.connection_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    verificationPrompt: row.verification_prompt,
    verificationCode: row.verification_code,
    error: row.error,
    screenshot: row.screenshot ?? null,
    pendingInteraction: row.pending_interaction ?? null,
  };
}

// Same "no RLS policy, admin client + manual scoping" pattern as
// automation_actions/scrape_jobs (see src/lib/automation/store.ts): this is
// touched by both a user-session route (creating/reading an attempt for a
// connection already ownership-checked via getConnection) and the
// extension/runner's bearer-token routes, which have no Supabase session at
// all — the admin client is the only one that works for both.
export async function createLoginAttempt(connectionId: string): Promise<LoginAttempt> {
  const now = new Date().toISOString();
  const attempt: LoginAttempt = {
    id: randomUUID(),
    connectionId,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    verificationPrompt: null,
    verificationCode: null,
    error: null,
    screenshot: null,
    pendingInteraction: null,
  };

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("login_attempts").insert({
      id: attempt.id,
      connection_id: attempt.connectionId,
      created_at: attempt.createdAt,
      updated_at: attempt.updatedAt,
      status: attempt.status,
      verification_prompt: null,
      verification_code: null,
      error: null,
      screenshot: null,
      pending_interaction: null,
    });
    if (error) throw error;
    return attempt;
  }

  const attempts = await readLocalFile();
  attempts.push(attempt);
  await writeLocalFile(attempts);
  return attempt;
}

export async function getLoginAttempt(id: string): Promise<LoginAttempt | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("login_attempts").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as LoginAttemptRow) : null;
  }
  const attempts = await readLocalFile();
  return attempts.find((a) => a.id === id) ?? null;
}

// Claims the oldest pending attempt for a connection (flips it to
// in_progress) — what the runner's main poll loop uses to start a new
// login. Not a real DB-level lock (same caveat as
// claimNextAction/claimNextScrapeJob): fine for a single runner instance
// polling on behalf of one connection at a time.
export async function claimNextLoginAttempt(connectionId: string): Promise<LoginAttempt | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: updated, error: updateError } = await supabase
      .from("login_attempts")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", (data as LoginAttemptRow).id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return updated ? fromRow(updated as LoginAttemptRow) : null;
  }

  const attempts = await readLocalFile();
  const next = attempts
    .filter((a) => a.connectionId === connectionId && a.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!next) return null;
  next.status = "in_progress";
  next.updatedAt = new Date().toISOString();
  await writeLocalFile(attempts);
  return next;
}

export async function updateLoginAttempt(
  id: string,
  patch: Partial<
    Pick<
      LoginAttempt,
      "status" | "verificationPrompt" | "verificationCode" | "error" | "screenshot" | "pendingInteraction"
    >
  >
): Promise<LoginAttempt | null> {
  const now = new Date().toISOString();

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const row: Record<string, unknown> = { updated_at: now };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.verificationPrompt !== undefined) row.verification_prompt = patch.verificationPrompt;
    if (patch.verificationCode !== undefined) row.verification_code = patch.verificationCode;
    if (patch.error !== undefined) row.error = patch.error;
    if (patch.screenshot !== undefined) row.screenshot = patch.screenshot;
    if (patch.pendingInteraction !== undefined) row.pending_interaction = patch.pendingInteraction;

    const { data, error } = await supabase
      .from("login_attempts")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as LoginAttemptRow) : null;
  }

  const attempts = await readLocalFile();
  const idx = attempts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  attempts[idx] = { ...attempts[idx], ...patch, updatedAt: now };
  await writeLocalFile(attempts);
  return attempts[idx];
}
