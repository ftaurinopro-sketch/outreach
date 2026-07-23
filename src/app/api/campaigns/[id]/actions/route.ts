import { NextResponse } from "next/server";
import { listActionsForCampaign } from "@/lib/automation/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const actions = await listActionsForCampaign(id);
  return NextResponse.json({ actions });
}
