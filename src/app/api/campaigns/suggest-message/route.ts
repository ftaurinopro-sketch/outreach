import { NextResponse } from "next/server";
import { hasClaudeConfig } from "@/lib/claude";
import { getAgent } from "@/lib/agents/store";
import { suggestCampaignMessage, type MessageStepKind } from "@/lib/campaigns/suggestMessage";

type Body = {
  agentId?: string;
  language?: string;
  kind?: MessageStepKind;
  stepIndex?: number;
  previousStepText?: string;
};

const VALID_KINDS: MessageStepKind[] = ["connectionNote", "firstMessage", "followUp"];

export async function POST(request: Request) {
  if (!hasClaudeConfig()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurata: necessaria per il suggerimento AI." },
      { status: 501 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.agentId || !body.language || !body.kind || !VALID_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "agentId, language e kind sono obbligatori" }, { status: 400 });
  }

  const agent = await getAgent(body.agentId);
  if (!agent) {
    return NextResponse.json({ error: "AI Assistant non trovato" }, { status: 404 });
  }

  try {
    const text = await suggestCampaignMessage({
      agent,
      language: body.language,
      kind: body.kind,
      stepIndex: body.stepIndex ?? 0,
      previousStepText: body.previousStepText,
    });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Message suggestion error", error);
    return NextResponse.json({ error: "Errore durante la generazione del suggerimento" }, { status: 502 });
  }
}
