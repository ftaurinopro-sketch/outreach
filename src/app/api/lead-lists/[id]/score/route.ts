import { NextResponse } from "next/server";
import { getLeadList, updateLeadListLeads } from "@/lib/leads/store";
import { getAgent } from "@/lib/agents/store";
import { scoreLeads } from "@/lib/leads/scoring";
import { hasClaudeConfig } from "@/lib/claude";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!hasClaudeConfig()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurata: necessaria per lo scoring AI." },
      { status: 501 }
    );
  }

  const { id } = await params;
  const body = (await request.json()) as { agentId?: string };
  if (!body.agentId) {
    return NextResponse.json({ error: "agentId è obbligatorio" }, { status: 400 });
  }

  const [list, agent] = await Promise.all([getLeadList(id), getAgent(body.agentId)]);
  if (!list) {
    return NextResponse.json({ error: "Lista non trovata" }, { status: 404 });
  }
  if (!agent) {
    return NextResponse.json({ error: "Agent non trovato" }, { status: 404 });
  }
  if (list.leads.length === 0) {
    return NextResponse.json({ error: "La lista non ha lead da analizzare" }, { status: 400 });
  }

  try {
    const scoredLeads = await scoreLeads(agent, list.leads);
    const updated = await updateLeadListLeads(id, scoredLeads);
    return NextResponse.json({ list: updated });
  } catch (error) {
    console.error("Lead scoring error", error);
    return NextResponse.json({ error: "Errore durante l'analisi AI" }, { status: 502 });
  }
}
