import { NextResponse } from "next/server";
import { deleteCampaign, getCampaign } from "@/lib/campaigns/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
