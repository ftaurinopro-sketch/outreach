import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connections/store";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";

type Params = { params: Promise<{ id: string; attemptId: string }> };

// The shared runner is a GitHub Actions cron job (see runner/README.md),
// not an always-on process — it claims pending jobs on its next pass,
// nominally every ~15 minutes but GitHub's free scheduled-workflow queue
// does not guarantee that cadence, so a job can sit "pending" for well
// over 15 minutes before anything picks it up. PENDING_TIMEOUT_MS must
// stay comfortably above that or the UI declares failure before the
// runner ever had a chance to run. Once a run does claim the job (status
// flips to "in_progress"), the actual browser automation is fast, so
// IN_PROGRESS_TIMEOUT_MS can stay short.
const PENDING_TIMEOUT_MS = 20 * 60 * 1000;
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
            ? "Il runner condiviso non ha ancora ripreso questo accesso (gira ogni ~15 minuti, a volte di più). Riprova tra qualche minuto, oppure incolla subito il cookie di sessione per un risultato immediato."
            : "Il runner ha avviato l'accesso ma non l'ha completato in tempo — riprova, oppure incolla il cookie di sessione manualmente.",
      })) ?? attempt;
  }

  return NextResponse.json({
    status: attempt.status,
    verificationPrompt: attempt.verificationPrompt,
    error: attempt.error,
  });
}
