import { NextResponse } from "next/server";
import {
  deleteConnection,
  updateConnectionLimits,
  updateConnectionSessionCookie,
  updateConnectionStatus,
} from "@/lib/connections/store";
import { CONNECTION_STATUSES, toPublicConnection, type ConnectionStatus } from "@/lib/connections/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    dailyConnectionLimit?: number;
    weeklyConnectionLimit?: number;
    dailyMessageLimit?: number;
  };

  if (body.status !== undefined) {
    if (!CONNECTION_STATUSES.includes(body.status as ConnectionStatus)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
    }
    const connection = await updateConnectionStatus(id, body.status as ConnectionStatus);
    if (!connection) return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
    return NextResponse.json({ connection: toPublicConnection(connection) });
  }

  const { dailyConnectionLimit, weeklyConnectionLimit, dailyMessageLimit } = body;
  if (
    typeof dailyConnectionLimit !== "number" ||
    typeof weeklyConnectionLimit !== "number" ||
    typeof dailyMessageLimit !== "number" ||
    dailyConnectionLimit < 0 ||
    weeklyConnectionLimit < 0 ||
    dailyMessageLimit < 0
  ) {
    return NextResponse.json({ error: "Limiti non validi" }, { status: 400 });
  }

  const connection = await updateConnectionLimits(id, {
    dailyConnectionLimit,
    weeklyConnectionLimit,
    dailyMessageLimit,
  });
  if (!connection) return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  return NextResponse.json({ connection: toPublicConnection(connection) });
}

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
  return NextResponse.json({ connection: toPublicConnection(connection) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteConnection(id);
  return NextResponse.json({ ok: true });
}
