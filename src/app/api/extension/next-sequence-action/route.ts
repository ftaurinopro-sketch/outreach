import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { claimDueEventForAccount } from "@/lib/execution/engine";
import { getProspectForEngine } from "@/lib/prospects/store";
import { getSequenceStepForEngine } from "@/lib/sequences/store";
import { resolveTemplate } from "@/lib/personalization/resolve";

// The sequence-engine equivalent of /api/extension/next-action — same
// per-connection bearer-token auth, but claims an activity_event instead
// of an automation_action. The runner polls both endpoints; whichever has
// work wins that cycle (see runner/index.js).
export async function GET(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const event = await claimDueEventForAccount(connection.id);
  if (!event) {
    return NextResponse.json({ action: null });
  }

  const prospect = await getProspectForEngine(event.prospectId);
  if (!prospect) {
    return NextResponse.json({ action: null });
  }

  let text: string | null = null;
  if (event.stepId) {
    const step = await getSequenceStepForEngine(event.stepId);
    if (step?.messageTemplate) {
      text = resolveTemplate(step.messageTemplate, prospect);
    }
  }

  return NextResponse.json({
    action: {
      id: event.id,
      type: event.actionType,
      leadLinkedinUrl: prospect.linkedinUrl,
      leadFirstName: prospect.firstName,
      text,
    },
  });
}
