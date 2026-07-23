import { NextResponse } from "next/server";
import { createLeadList, listLeadLists } from "@/lib/leads/store";
import type { Lead, LeadSourceType } from "@/lib/leads/types";

export async function GET() {
  const lists = await listLeadLists();
  return NextResponse.json({ lists });
}

type CreateBody = {
  name: string;
  sourceType: LeadSourceType;
  leads: Lead[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateBody>;

  if (!body.name || !body.sourceType || !body.leads?.length) {
    return NextResponse.json(
      { error: "name, sourceType e almeno un lead sono obbligatori" },
      { status: 400 }
    );
  }

  const list = await createLeadList(body.name, body.sourceType, body.leads);
  return NextResponse.json({ list: { ...list, leadCount: list.leads.length } }, { status: 201 });
}
