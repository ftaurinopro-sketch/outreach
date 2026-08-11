import { NextResponse } from "next/server";
import { listProspects, upsertProspects } from "@/lib/prospects/store";
import type { ProspectInput } from "@/lib/prospects/types";
import { PROSPECT_SOURCES } from "@/lib/prospects/types";

export async function GET() {
  const prospects = await listProspects();
  return NextResponse.json({ prospects });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { prospects?: Partial<ProspectInput>[] };
  const inputs = body.prospects ?? [];

  const valid: ProspectInput[] = [];
  for (const p of inputs) {
    if (!p.linkedinUrl || !p.linkedinUrl.trim()) continue;
    valid.push({
      linkedinUrl: p.linkedinUrl.trim(),
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      headline: p.headline ?? "",
      company: p.company ?? "",
      position: p.position ?? "",
      location: p.location ?? "",
      industry: p.industry ?? "",
      email: p.email ?? "",
      notes: p.notes ?? "",
      tags: p.tags ?? [],
      customFields: p.customFields ?? {},
      source: PROSPECT_SOURCES.includes(p.source as (typeof PROSPECT_SOURCES)[number])
        ? (p.source as (typeof PROSPECT_SOURCES)[number])
        : "manual",
    });
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: "Nessun prospect valido (serve almeno linkedinUrl)" }, { status: 400 });
  }

  const prospects = await upsertProspects(valid);
  return NextResponse.json({ prospects }, { status: 201 });
}
