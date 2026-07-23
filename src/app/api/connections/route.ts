import { NextResponse } from "next/server";
import { createConnection, listConnections } from "@/lib/connections/store";
import { DEFAULT_CONNECTION_LIMITS, isConnectionOnline, type ConnectionInput } from "@/lib/connections/types";

export async function GET() {
  const connections = await listConnections();
  return NextResponse.json({
    connections: connections.map((c) => ({ ...c, online: isConnectionOnline(c) })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ConnectionInput>;

  if (!body.label) {
    return NextResponse.json({ error: "label è obbligatoria" }, { status: 400 });
  }

  const connection = await createConnection({
    label: body.label,
    dailyConnectionLimit: body.dailyConnectionLimit ?? DEFAULT_CONNECTION_LIMITS.dailyConnectionLimit,
    weeklyConnectionLimit: body.weeklyConnectionLimit ?? DEFAULT_CONNECTION_LIMITS.weeklyConnectionLimit,
    dailyMessageLimit: body.dailyMessageLimit ?? DEFAULT_CONNECTION_LIMITS.dailyMessageLimit,
  });

  // Only time the token is returned in full — after this, treat it as write-only.
  return NextResponse.json({ connection }, { status: 201 });
}
