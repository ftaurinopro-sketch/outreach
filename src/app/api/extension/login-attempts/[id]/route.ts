import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";

type Params = { params: Promise<{ id: string }> };

// Polled by the runner while it's holding a live browser session open,
// waiting for the user to submit the verification code LinkedIn asked for
// (see POST /api/connections/[id]/login/[attemptId]/verify), or — same
// idea — the next click/keystroke to relay during a live CAPTCHA-assist
// session (see .../interact). Bearer-token authenticated like every other
// extension/runner route — distinct from the user-facing status endpoint,
// which never returns verificationCode or pendingInteraction.
export async function GET(request: Request, { params }: Params) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const { id } = await params;
  const attempt = await getLoginAttempt(id);
  if (!attempt || attempt.connectionId !== connection.id) {
    return NextResponse.json({ error: "Tentativo non trovato" }, { status: 404 });
  }

  // Claimed (read-and-cleared) rather than left for the next poll: the
  // runner applies it once to the live page, so it must not be replayed on
  // a subsequent GET before the user queues a new one.
  if (attempt.pendingInteraction) {
    await updateLoginAttempt(id, { pendingInteraction: null });
  }

  return NextResponse.json({
    status: attempt.status,
    verificationCode: attempt.verificationCode,
    pendingInteraction: attempt.pendingInteraction,
  });
}
