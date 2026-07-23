import { NextResponse } from "next/server";
import { listActionsForCampaign } from "@/lib/automation/store";
import { getCampaign } from "@/lib/campaigns/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  // automation_actions has no RLS (see supabase/migrations/0007_*.sql), so
  // ownership must be verified here via the RLS-protected campaigns table
  // before returning anything — otherwise this would leak other tenants'
  // automation queues to whoever guesses a campaign id.
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }

  const actions = await listActionsForCampaign(id);
  return NextResponse.json({ actions });
}
