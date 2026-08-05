import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connections/store";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";

type Params = { params: Promise<{ id: string; attemptId: string }> };

// No runner is running by default — it's a local process the user starts
// themselves (see the "Advanced" setup instructions). Without this, an
// attempt no runner ever picks up just sits at "pending"/"in_progress"
// forever, and the UI would poll it forever too, leaving the user staring
// at "Logging in..." with no way to know anything is actually wrong.
const PENDING_TIMEOUT_MS = 30_000;
const IN_PROGRESS_TIMEOUT_MS = 120_000;

// Polled by the web UI to show live login progress. Never returns
// verificationCode or credentials — only what the user needs to see.
export async function GET(_request: Request, { params }: Params) {
  const { id, attemptId } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  let attempt = await getLoginAttempt(attemptId);
  if (!attempt || attempt.connectionId !== id) {
    return NextResponse.json({ error: "Tentativo non trovato" }, { status: 404 });
  }

  const ageMs = Date.now() - new Date(attempt.createdAt).getTime();
  const timedOut =
    (attempt.status === "pending" && ageMs > PENDING_TIMEOUT_MS) ||
    (attempt.status === "in_progress" && ageMs > IN_PROGRESS_TIMEOUT_MS);

  if (timedOut) {
    attempt =
      (await updateLoginAttempt(attemptId, {
        status: "failed",
        error:
          attempt.status === "pending"
            ? "No runner picked up this login. Make sure the runner is running on your computer (see Advanced below), or paste a session cookie manually instead."
            : "The runner started this login but didn't finish in time. Check the runner's terminal for errors, or try again.",
      })) ?? attempt;
  }

  return NextResponse.json({
    status: attempt.status,
    verificationPrompt: attempt.verificationPrompt,
    error: attempt.error,
  });
}
