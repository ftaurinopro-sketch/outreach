import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connections/store";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";

type Params = { params: Promise<{ id: string; attemptId: string }> };

// User submits the verification code LinkedIn showed them. The runner is
// polling GET /api/extension/login-attempts/[id] for this same field while
// holding the login page open — see runner/index.js.
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
  if (attempt.status !== "awaiting_verification") {
    return NextResponse.json({ error: "Questo tentativo non è in attesa di un codice di verifica" }, { status: 409 });
  }

  const body = (await request.json()) as { code?: string };
  if (!body.code?.trim()) {
    return NextResponse.json({ error: "code è obbligatorio" }, { status: 400 });
  }

  await updateLoginAttempt(attempt.id, { verificationCode: body.code.trim() });
  return NextResponse.json({ ok: true });
}
