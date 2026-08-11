import { NextResponse } from "next/server";
import { createCampaign } from "@/lib/campaigns/store";
import { CAMPAIGN_LANGUAGES, DEFAULT_AUTOMATION_SETTINGS, type CampaignAutomationSettings } from "@/lib/campaigns/types";

// Creates the campaign "shell" for the new sequence-engine flow: a
// campaign with no leadListId and no messages (the legacy fields, left
// empty/sentinel so the existing Campaign type/store don't need to
// change). Its actual content — steps and enrolled prospects — is
// attached afterward via POST /api/campaigns/[id]/sequence and
// POST /api/campaigns/[id]/prospects. Kept as a separate route from
// POST /api/campaigns (which still requires leadListId + a first message)
// so the legacy campaign-creation flow is untouched.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    agentId?: string | null;
    language?: string;
    automationSettings?: Partial<CampaignAutomationSettings>;
  };

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "name è obbligatorio" }, { status: 400 });
  }

  const campaign = await createCampaign({
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    leadListId: "",
    agentId: body.agentId || null,
    connectionNote: "",
    messages: [],
    language: CAMPAIGN_LANGUAGES.includes(body.language as (typeof CAMPAIGN_LANGUAGES)[number])
      ? (body.language as (typeof CAMPAIGN_LANGUAGES)[number])
      : "Italiano",
    automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS, ...body.automationSettings },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
