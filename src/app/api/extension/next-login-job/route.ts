import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { getConnectionCredentialsForLogin } from "@/lib/connections/store";
import { claimNextLoginAttempt } from "@/lib/connections/login-store";

export async function GET(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const attempt = await claimNextLoginAttempt(connection.id);
  if (!attempt) {
    return NextResponse.json({ job: null });
  }

  const credentials = await getConnectionCredentialsForLogin(connection.id);
  if (!credentials) {
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: { attemptId: attempt.id, email: credentials.email, password: credentials.password },
  });
}
