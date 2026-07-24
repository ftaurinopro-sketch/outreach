import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connections/store";
import { getLoginAttempt } from "@/lib/connections/login-store";

type Params = { params: Promise<{ id: string; attemptId: string }> };

// Polled by the web UI to show live login progress. Never returns
// verificationCode or credentials — only what the user needs to see.
export async function GET(_request: Request, { params }: Params) {
  const { id, attemptId } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  const attempt = await getLoginAttempt(attemptId);
  if (!attempt || attempt.connectionId !== id) {
    return NextResponse.json({ error: "Tentativo non trovato" }, { status: 404 });
  }

  return NextResponse.json({
    status: attempt.status,
    verificationPrompt: attempt.verificationPrompt,
    error: attempt.error,
  });
}
