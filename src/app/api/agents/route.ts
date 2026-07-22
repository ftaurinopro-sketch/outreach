import { NextResponse } from "next/server";
import { createAgent, listAgents } from "@/lib/agents/store";
import type { AgentInput } from "@/lib/agents/types";

export async function GET() {
  const agents = await listAgents();
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AgentInput>;

  if (!body.name || !body.companyName) {
    return NextResponse.json(
      { error: "name e companyName sono obbligatori" },
      { status: 400 }
    );
  }

  const agent = await createAgent({
    name: body.name,
    companyName: body.companyName,
    valueProp: body.valueProp ?? "",
    differentiation: body.differentiation ?? "",
    icp: body.icp ?? "",
    tone: body.tone ?? "Casual",
    goal: body.goal ?? "Prenotare una call",
    calendarLink: body.calendarLink ?? "",
    objections: body.objections ?? "",
    guardrails: body.guardrails ?? "",
  });

  return NextResponse.json({ agent }, { status: 201 });
}
