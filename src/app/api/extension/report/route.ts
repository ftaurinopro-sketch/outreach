import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { cancelPendingMessagesForLead, getAction, updateAction } from "@/lib/automation/store";
import {
  enqueueAcceptanceCheck,
  enqueueMessagesAfterAcceptance,
  MAX_ACCEPTANCE_CHECKS,
} from "@/lib/automation/scheduler";
import { getCampaignForExtension } from "@/lib/campaigns/store";

type ReportBody = {
  actionId: string;
  success: boolean;
  error?: string;
  accepted?: boolean;
  replied?: boolean;
};

const RETRY_DELAY_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ReportBody>;
  if (!body.actionId || typeof body.success !== "boolean") {
    return NextResponse.json({ error: "actionId e success sono obbligatori" }, { status: 400 });
  }

  const action = await getAction(body.actionId);
  if (!action || action.connectionId !== connection.id) {
    return NextResponse.json({ error: "Azione non trovata" }, { status: 404 });
  }

  if (!body.success) {
    if (action.attempts < MAX_ATTEMPTS) {
      await updateAction(action.id, {
        status: "pending",
        scheduledAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
        lastError: body.error ?? "Errore non specificato",
      });
    } else {
      await updateAction(action.id, { status: "failed", lastError: body.error ?? "Errore non specificato" });
    }
    return NextResponse.json({ ok: true });
  }

  switch (action.type) {
    case "send_connection_request": {
      await updateAction(action.id, { status: "done" });
      await enqueueAcceptanceCheck(action);
      break;
    }
    case "check_acceptance": {
      if (body.accepted) {
        await updateAction(action.id, { status: "done" });
        const campaign = await getCampaignForExtension(action.campaignId);
        if (campaign) {
          await enqueueMessagesAfterAcceptance({
            action,
            messages: campaign.messages,
            settings: campaign.automationSettings,
          });
        }
      } else {
        const nextCheckCount = action.checkCount + 1;
        if (nextCheckCount >= MAX_ACCEPTANCE_CHECKS) {
          await updateAction(action.id, { status: "expired", checkCount: nextCheckCount });
        } else {
          await updateAction(action.id, {
            status: "pending",
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            checkCount: nextCheckCount,
          });
        }
      }
      break;
    }
    case "send_message": {
      await updateAction(action.id, { status: "done" });
      break;
    }
    case "check_reply": {
      await updateAction(action.id, { status: "done", payload: { replied: Boolean(body.replied) } });
      if (body.replied) {
        await cancelPendingMessagesForLead(action.campaignId, action.leadLinkedinUrl);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
