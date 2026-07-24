import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns/store";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  MAX_SEQUENCE_MESSAGES,
  type CampaignInput,
} from "@/lib/campaigns/types";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CampaignInput>;
  const messages = (body.messages ?? []).slice(0, MAX_SEQUENCE_MESSAGES);

  if (!body.name || !body.leadListId || !body.agentId || !messages[0]?.text?.trim()) {
    return NextResponse.json(
      { error: "name, leadListId, agentId e il primo messaggio sono obbligatori" },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    name: body.name,
    leadListId: body.leadListId,
    agentId: body.agentId,
    connectionNote: body.connectionNote ?? "",
    messages,
    replyMode: body.replyMode === "autonomous" ? "autonomous" : "review",
    automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS, ...body.automationSettings },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
