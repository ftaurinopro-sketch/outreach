import { NextResponse } from "next/server";
import { deleteCampaign, getCampaign, pauseCampaign, resumeCampaign } from "@/lib/campaigns/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { action?: string };

  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }

  if (body.action === "pause") {
    if (campaign.status !== "active") {
      return NextResponse.json({ error: "Solo una campagna attiva può essere messa in pausa" }, { status: 400 });
    }
    return NextResponse.json({ campaign: await pauseCampaign(id) });
  }

  if (body.action === "resume") {
    if (campaign.status !== "paused") {
      return NextResponse.json({ error: "Solo una campagna in pausa può essere ripresa" }, { status: 400 });
    }
    return NextResponse.json({ campaign: await resumeCampaign(id) });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
