import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { getLoginAttempt, updateLoginAttempt } from "@/lib/connections/login-store";
import { updateConnectionSessionCookie } from "@/lib/connections/store";
import type { LoginAttemptStatus } from "@/lib/connections/types";

type ReportBody = {
  attemptId: string;
  status: LoginAttemptStatus;
  verificationPrompt?: string;
  sessionCookie?: string;
  error?: string;
};

export async function POST(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ReportBody>;
  if (!body.attemptId || !body.status) {
    return NextResponse.json({ error: "attemptId e status sono obbligatori" }, { status: 400 });
  }

  const attempt = await getLoginAttempt(body.attemptId);
  if (!attempt || attempt.connectionId !== connection.id) {
    return NextResponse.json({ error: "Tentativo non trovato" }, { status: 404 });
  }

  await updateLoginAttempt(attempt.id, {
    status: body.status,
    verificationPrompt: body.verificationPrompt ?? attempt.verificationPrompt,
    error: body.error ?? null,
  });

  if (body.status === "success" && body.sessionCookie) {
    await updateConnectionSessionCookie(connection.id, body.sessionCookie);
  }

  return NextResponse.json({ ok: true });
}
