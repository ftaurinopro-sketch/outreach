import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connections/store";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";
import { LOGIN_SCREENSHOT_VIEWPORT, type LoginAttemptInteraction } from "@/lib/connections/types";

type Params = { params: Promise<{ id: string; attemptId: string }> };

// The human account owner relays a click/keystroke into the live,
// still-open LinkedIn page the runner is holding open on their behalf —
// see runner/index.js's live-assist loop, which polls
// GET /api/extension/login-attempts/[id] for this same field and applies
// it with Playwright. The runner never decides what to click or type;
// every action here is one the user themselves chose while looking at the
// screenshot in the UI, same as if they'd been driving the browser
// directly — this exists so a CAPTCHA/checkpoint doesn't force them out to
// DevTools and a manual cookie paste.
export async function POST(request: Request, { params }: Params) {
  const { id, attemptId } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  const attempt = await getLoginAttempt(attemptId);
  if (!attempt || attempt.connectionId !== id) {
    return NextResponse.json({ error: "Tentativo non trovato" }, { status: 404 });
  }
  if (attempt.status !== "awaiting_manual_captcha") {
    return NextResponse.json({ error: "Questo tentativo non è in attesa di un'interazione" }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as Partial<LoginAttemptInteraction> | null;
  if (!body?.type) {
    return NextResponse.json({ error: "type è obbligatorio" }, { status: 400 });
  }

  let interaction: LoginAttemptInteraction;
  if (body.type === "click") {
    const x = Number(body.x);
    const y = Number(body.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > LOGIN_SCREENSHOT_VIEWPORT.width || y > LOGIN_SCREENSHOT_VIEWPORT.height) {
      return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
    }
    interaction = { type: "click", x, y };
  } else if (body.type === "type") {
    const text = typeof body.text === "string" ? body.text.slice(0, 500) : "";
    if (!text) {
      return NextResponse.json({ error: "text è obbligatorio" }, { status: 400 });
    }
    interaction = { type: "type", text };
  } else if (body.type === "key") {
    const key = typeof body.key === "string" ? body.key.slice(0, 40) : "";
    if (!key) {
      return NextResponse.json({ error: "key è obbligatorio" }, { status: 400 });
    }
    interaction = { type: "key", key };
  } else {
    return NextResponse.json({ error: "type non riconosciuto" }, { status: 400 });
  }

  await updateLoginAttempt(attemptId, { pendingInteraction: interaction });
  return NextResponse.json({ ok: true });
}
