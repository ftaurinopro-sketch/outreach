import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agents/store";
import { hasClaudeConfig, sendSandboxMessage, type ChatMessage } from "@/lib/claude";
import { buildSandboxSystemPrompt, type ProspectProfile } from "@/lib/prompt";

type Body = {
  agentId: string;
  prospect: ProspectProfile;
  history: ChatMessage[];
  openingMessage?: string;
};

export async function POST(request: Request) {
  if (!hasClaudeConfig()) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY non configurata. Aggiungila in .env.local per usare la Sandbox.",
      },
      { status: 501 }
    );
  }

  const body = (await request.json()) as Body;

  if (!body.agentId || !body.history?.length) {
    return NextResponse.json({ error: "agentId e history sono obbligatori" }, { status: 400 });
  }

  const agent = await getAgent(body.agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent non trovato" }, { status: 404 });
  }

  const systemPrompt = buildSandboxSystemPrompt(agent, body.prospect, body.openingMessage);

  try {
    const reply = await sendSandboxMessage(systemPrompt, body.history);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Sandbox chat error", error);
    return NextResponse.json({ error: "Errore nella chiamata a Claude" }, { status: 502 });
  }
}
