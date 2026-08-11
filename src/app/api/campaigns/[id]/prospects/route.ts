import { NextResponse } from "next/server";
import {
  addProspectsToCampaign,
  findActiveOverlaps,
  listCampaignProspects,
} from "@/lib/campaignProspects/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const prospects = await listCampaignProspects(id);
  return NextResponse.json({ prospects });
}

// Before enrolling, checks for prospects already non-terminally active in a
// *different* campaign and returns them as `overlaps` instead of silently
// adding everyone — per the product spec, this is a warning the user can
// override (force: true), not a hard block. Only actually enrolls anyone
// once force is set or there's nothing to warn about.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { prospectIds?: string[]; force?: boolean };
  const prospectIds = body.prospectIds ?? [];

  if (prospectIds.length === 0) {
    return NextResponse.json({ error: "prospectIds è obbligatorio" }, { status: 400 });
  }

  if (!body.force) {
    const overlaps = await findActiveOverlaps(prospectIds, id);
    if (overlaps.length > 0) {
      return NextResponse.json({ overlaps, added: [] });
    }
  }

  const added = await addProspectsToCampaign(id, prospectIds);
  return NextResponse.json({ added, overlaps: [] }, { status: 201 });
}
