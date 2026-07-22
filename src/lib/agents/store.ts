import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { AgentConfig, AgentInput } from "./types";

// Local dev fallback: zero-config JSON file store, used only when Supabase
// env vars aren't set yet. Not suitable for production (Vercel's filesystem
// isn't persistent) — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// and run supabase/migrations/0001_agents.sql to switch to Supabase.
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "agents.json");

async function readLocalFile(): Promise<AgentConfig[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as AgentConfig[];
  } catch {
    return [];
  }
}

async function writeLocalFile(agents: AgentConfig[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(agents, null, 2), "utf-8");
}

type AgentRow = {
  id: string;
  created_at: string;
  updated_at: string;
  config: AgentInput;
};

function fromRow(row: AgentRow): AgentConfig {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row.config,
  };
}

function toConfig(agent: AgentConfig): AgentInput {
  return {
    name: agent.name,
    companyName: agent.companyName,
    valueProp: agent.valueProp,
    differentiation: agent.differentiation,
    icp: agent.icp,
    tone: agent.tone,
    goal: agent.goal,
    calendarLink: agent.calendarLink,
    objections: agent.objections,
    guardrails: agent.guardrails,
  };
}

export async function listAgents(): Promise<AgentConfig[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as AgentRow[]).map(fromRow);
  }
  const agents = await readLocalFile();
  return [...agents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAgent(id: string): Promise<AgentConfig | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as AgentRow) : null;
  }
  const agents = await readLocalFile();
  return agents.find((a) => a.id === id) ?? null;
}

export async function createAgent(input: AgentInput): Promise<AgentConfig> {
  const now = new Date().toISOString();
  const agent: AgentConfig = { id: randomUUID(), createdAt: now, updatedAt: now, ...input };

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("agents").insert({
      id: agent.id,
      created_at: agent.createdAt,
      updated_at: agent.updatedAt,
      config: input,
    });
    if (error) throw error;
    return agent;
  }

  const agents = await readLocalFile();
  agents.push(agent);
  await writeLocalFile(agents);
  return agent;
}

export async function updateAgent(id: string, input: AgentInput): Promise<AgentConfig> {
  const updatedAt = new Date().toISOString();

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("agents")
      .update({ updated_at: updatedAt, config: input })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Agent not found");
    return fromRow(data as AgentRow);
  }

  const agents = await readLocalFile();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Agent not found");
  const updated: AgentConfig = { ...agents[idx], ...input, updatedAt };
  agents[idx] = updated;
  await writeLocalFile(agents);
  return updated;
}

export async function deleteAgent(id: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const agents = await readLocalFile();
  await writeLocalFile(agents.filter((a) => a.id !== id));
}

export function agentToConfig(agent: AgentConfig): AgentInput {
  return toConfig(agent);
}
