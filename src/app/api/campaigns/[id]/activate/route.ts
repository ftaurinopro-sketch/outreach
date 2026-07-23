import { NextResponse } from "next/server";
import { activateCampaign, getCampaign } from "@/lib/campaigns/store";
import { getConnection } from "@/lib/connections/store";
import { getLeadList } from "@/lib/leads/store";
import { enqueueConnectionRequests } from "@/lib/automation/scheduler";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { connectionId?: string };

  if (!body.connectionId) {
    return NextResponse.json({ error: "connectionId è obbligatorio" }, { status: 400 });
  }

  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "La campagna è già attiva" }, { status: 409 });
  }

  const connection = await getConnection(body.connectionId);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  const leadList = await getLeadList(campaign.leadListId);
  if (!leadList || leadList.leads.length === 0) {
    return NextResponse.json({ error: "La lista lead è vuota o non esiste più" }, { status: 400 });
  }

  const queued = await enqueueConnectionRequests({
    campaignId: campaign.id,
    connectionId: connection.id,
    connectionNote: campaign.connectionNote,
    leads: leadList.leads,
    dailyConnectionLimit: connection.dailyConnectionLimit,
  });

  const updated = await activateCampaign(campaign.id, connection.id);

  return NextResponse.json({ campaign: updated, queuedActions: queued });
}
