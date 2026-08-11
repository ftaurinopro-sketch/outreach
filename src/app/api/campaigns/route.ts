import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns/store";
import {
  CAMPAIGN_LANGUAGES,
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

  if (!body.name || !body.leadListId || !messages[0]?.text?.trim()) {
    return NextResponse.json(
      { error: "name, leadListId e il primo messaggio sono obbligatori" },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    name: body.name,
    description: body.description ?? "",
    leadListId: body.leadListId,
    agentId: body.agentId || null,
    connectionNote: body.connectionNote ?? "",
    messages,
    language: CAMPAIGN_LANGUAGES.includes(body.language as (typeof CAMPAIGN_LANGUAGES)[number])
      ? (body.language as (typeof CAMPAIGN_LANGUAGES)[number])
      : "Italiano",
    automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS, ...body.automationSettings },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
