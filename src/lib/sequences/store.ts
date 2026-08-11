import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { SequenceStep, SequenceStepInput } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "sequence-steps.json");

async function readLocalFile(): Promise<SequenceStep[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as SequenceStep[];
  } catch {
    return [];
  }
}

async function writeLocalFile(steps: SequenceStep[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(steps, null, 2), "utf-8");
}

type SequenceStepRow = {
  id: string;
  campaign_id: string;
  position: number;
  action_type: SequenceStep["actionType"];
  execution_mode: SequenceStep["executionMode"];
  delay_minutes: number;
  message_template: string | null;
  ai_prompt: string | null;
  conditions: SequenceStep["conditions"];
};

function fromRow(row: SequenceStepRow): SequenceStep {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    position: row.position,
    actionType: row.action_type,
    executionMode: row.execution_mode,
    delayMinutes: row.delay_minutes,
    messageTemplate: row.message_template,
    aiPrompt: row.ai_prompt,
    conditions: row.conditions ?? {},
  };
}

export async function listSequenceSteps(campaignId: string): Promise<SequenceStep[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("sequence_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data as SequenceStepRow[]).map(fromRow);
  }
  const steps = await readLocalFile();
  return steps
    .filter((s) => s.campaignId === campaignId)
    .sort((a, b) => a.position - b.position);
}

// Full replace: the sequence builder always saves the whole ordered list at
// once (add/reorder/edit/delete all happen client-side first, then one
// save) rather than issuing incremental step-by-step mutations — simpler
// to reason about than diffing, and sequences are short (a handful of
// steps), so this is cheap.
export async function replaceSequenceSteps(
  campaignId: string,
  inputs: SequenceStepInput[]
): Promise<SequenceStep[]> {
  const steps: SequenceStep[] = inputs.map((input, position) => ({
    id: randomUUID(),
    campaignId,
    position,
    actionType: input.actionType,
    executionMode: input.executionMode,
    delayMinutes: input.delayMinutes,
    messageTemplate: input.messageTemplate ?? null,
    aiPrompt: input.aiPrompt ?? null,
    conditions: input.conditions ?? {},
  }));

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error: deleteError } = await supabase
      .from("sequence_steps")
      .delete()
      .eq("campaign_id", campaignId);
    if (deleteError) throw deleteError;
    if (steps.length === 0) return [];
    const { data, error } = await supabase
      .from("sequence_steps")
      .insert(
        steps.map((s) => ({
          id: s.id,
          campaign_id: s.campaignId,
          position: s.position,
          action_type: s.actionType,
          execution_mode: s.executionMode,
          delay_minutes: s.delayMinutes,
          message_template: s.messageTemplate,
          ai_prompt: s.aiPrompt,
          conditions: s.conditions,
        }))
      )
      .select("*");
    if (error) throw error;
    return (data as SequenceStepRow[]).map(fromRow);
  }

  const all = await readLocalFile();
  const rest = all.filter((s) => s.campaignId !== campaignId);
  await writeLocalFile([...rest, ...steps]);
  return steps;
}

// Service-role-scoped read, for the execution engine's runner-triggered
// context (bearer token, no Supabase session — RLS's auth.uid() isn't
// available there, same trust boundary as getCampaignForExtension in
// campaigns/store.ts). User-facing pages should keep using
// listSequenceSteps above.
export async function listSequenceStepsForEngine(campaignId: string): Promise<SequenceStep[]> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sequence_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data as SequenceStepRow[]).map(fromRow);
  }
  const steps = await readLocalFile();
  return steps
    .filter((s) => s.campaignId === campaignId)
    .sort((a, b) => a.position - b.position);
}

export async function getSequenceStep(id: string): Promise<SequenceStep | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase.from("sequence_steps").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as SequenceStepRow) : null;
  }
  const steps = await readLocalFile();
  return steps.find((s) => s.id === id) ?? null;
}

// Service-role-scoped variant for the execution engine's runner-triggered
// context — see listSequenceStepsForEngine above for the same rationale.
export async function getSequenceStepForEngine(id: string): Promise<SequenceStep | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("sequence_steps").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as SequenceStepRow) : null;
  }
  const steps = await readLocalFile();
  return steps.find((s) => s.id === id) ?? null;
}
