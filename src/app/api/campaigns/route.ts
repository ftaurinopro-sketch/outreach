import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns/store";
import type { CampaignInput } from "@/lib/campaigns/types";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CampaignInput>;

  if (!body.name || !body.leadListId || !body.agentId || !body.message1) {
    return NextResponse.json(
      { error: "name, leadListId, agentId e message1 sono obbligatori" },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    name: body.name,
    leadListId: body.leadListId,
    agentId: body.agentId,
    connectionNote: body.connectionNote ?? "",
    message1: body.message1,
    followUpMessage: body.followUpMessage ?? "",
    followUpDelayDays: body.followUpDelayDays ?? 5,
    replyMode: body.replyMode === "autonomous" ? "autonomous" : "review",
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
