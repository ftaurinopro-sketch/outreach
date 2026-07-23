import { NextResponse } from "next/server";
import { deleteConnection, updateConnectionSessionCookie } from "@/lib/connections/store";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { sessionCookie?: string };

  if (!body.sessionCookie || !body.sessionCookie.trim()) {
    return NextResponse.json({ error: "sessionCookie è obbligatorio" }, { status: 400 });
  }

  const connection = await updateConnectionSessionCookie(id, body.sessionCookie.trim());
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }
  return NextResponse.json({ connection });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteConnection(id);
  return NextResponse.json({ ok: true });
}
