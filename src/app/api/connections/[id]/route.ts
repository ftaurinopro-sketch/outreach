import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteConnection(id);
  return NextResponse.json({ ok: true });
}
