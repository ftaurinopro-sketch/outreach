import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { getActivityEvent } from "@/lib/activity/store";
import { reportActivityEventResult } from "@/lib/execution/engine";
import type { StepResult } from "@/lib/execution/types";

// The sequence-engine equivalent of /api/extension/report.
export async function POST(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    actionId?: string;
    success?: boolean;
    error?: string;
    connected?: boolean;
    replied?: boolean;
  };

  if (!body.actionId || typeof body.success !== "boolean") {
    return NextResponse.json({ error: "actionId e success sono obbligatori" }, { status: 400 });
  }

  // Ownership check: the event must actually belong to this connection,
  // same reasoning as GET /api/campaigns/[id]/actions verifying campaign
  // ownership before returning automation_actions rows — activity_events
  // has no RLS of its own, this route is the enforcement point.
  const event = await getActivityEvent(body.actionId);
  if (!event || event.accountId !== connection.id) {
    return NextResponse.json({ error: "Azione non trovata" }, { status: 404 });
  }

  const result: StepResult = {
    success: body.success,
    error: body.error,
    connected: body.connected,
    replied: body.replied,
  };
  await reportActivityEventResult(body.actionId, result);

  return NextResponse.json({ ok: true });
}
