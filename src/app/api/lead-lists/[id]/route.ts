import { NextResponse } from "next/server";
import { deleteLeadList, getLeadList } from "@/lib/leads/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const list = await getLeadList(id);
  if (!list) {
    return NextResponse.json({ error: "Lista non trovata" }, { status: 404 });
  }
  return NextResponse.json({ list });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteLeadList(id);
  return NextResponse.json({ ok: true });
}
