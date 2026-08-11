import { NextResponse } from "next/server";
import { listSequenceSteps, replaceSequenceSteps } from "@/lib/sequences/store";
import { SEQUENCE_ACTION_TYPES, EXECUTION_MODES, type SequenceStepInput } from "@/lib/sequences/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const steps = await listSequenceSteps(id);
  return NextResponse.json({ steps });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { steps?: Partial<SequenceStepInput>[] };
  const inputs = body.steps ?? [];

  const valid: SequenceStepInput[] = [];
  for (const s of inputs) {
    if (!s.actionType || !SEQUENCE_ACTION_TYPES.includes(s.actionType)) {
      return NextResponse.json({ error: `Tipo di step non valido: ${s.actionType}` }, { status: 400 });
    }
    if (s.executionMode && !EXECUTION_MODES.includes(s.executionMode)) {
      return NextResponse.json({ error: `Modalità di esecuzione non valida: ${s.executionMode}` }, { status: 400 });
    }
    if (s.actionType === "send_message" && !s.messageTemplate?.trim() && !s.aiPrompt?.trim()) {
      return NextResponse.json(
        { error: "Ogni step 'Invia messaggio' richiede un testo o un prompt AI" },
        { status: 400 }
      );
    }
    valid.push({
      actionType: s.actionType,
      executionMode: s.executionMode ?? "automatic",
      delayMinutes: Math.max(0, s.delayMinutes ?? 0),
      messageTemplate: s.messageTemplate ?? null,
      aiPrompt: s.aiPrompt ?? null,
      conditions: s.conditions ?? {},
    });
  }

  const steps = await replaceSequenceSteps(id, valid);
  return NextResponse.json({ steps });
}
