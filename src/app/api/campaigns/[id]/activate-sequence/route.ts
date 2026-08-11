import { NextResponse } from "next/server";
import { activateCampaign, getCampaign } from "@/lib/campaigns/store";
import { getConnection } from "@/lib/connections/store";
import { listSequenceSteps } from "@/lib/sequences/store";
import { listCampaignProspects } from "@/lib/campaignProspects/store";
import { initializeCampaignProspects } from "@/lib/execution/engine";

type Params = { params: Promise<{ id: string }> };

// Activation for sequence-mode campaigns (built via POST
// /api/campaigns/sequence) — the equivalent of
// POST /api/campaigns/[id]/activate for the legacy lead-list-driven flow,
// but schedules the first due action for every enrolled prospect via the
// execution engine instead of enqueueing connection-request actions
// directly.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { connectionId?: string };

  if (!body.connectionId) {
    return NextResponse.json({ error: "connectionId è obbligatorio" }, { status: 400 });
  }

  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }
  if (campaign.leadListId) {
    return NextResponse.json(
      { error: "Questa campagna usa il flusso legacy — usa /activate invece" },
      { status: 400 }
    );
  }
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Solo le campagne in bozza possono essere attivate" }, { status: 409 });
  }

  const connection = await getConnection(body.connectionId);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  const [steps, prospects] = await Promise.all([listSequenceSteps(id), listCampaignProspects(id)]);
  if (steps.length === 0) {
    return NextResponse.json({ error: "La campagna non ha una sequenza definita" }, { status: 400 });
  }
  if (prospects.length === 0) {
    return NextResponse.json({ error: "La campagna non ha prospect iscritti" }, { status: 400 });
  }

  const updated = await activateCampaign(id, body.connectionId);
  const scheduled = await initializeCampaignProspects(id);

  return NextResponse.json({ campaign: updated, scheduled });
}
