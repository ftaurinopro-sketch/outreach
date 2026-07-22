import { NextResponse } from "next/server";
import { agentToConfig, deleteAgent, getAgent, updateAgent } from "@/lib/agents/store";
import type { AgentInput } from "@/lib/agents/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent non trovato" }, { status: 404 });
  }
  return NextResponse.json({ agent });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await getAgent(id);
  if (!existing) {
    return NextResponse.json({ error: "Agent non trovato" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<AgentInput>;
  const input: AgentInput = { ...agentToConfig(existing), ...body };
  const agent = await updateAgent(id, input);
  return NextResponse.json({ agent });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteAgent(id);
  return NextResponse.json({ ok: true });
}
