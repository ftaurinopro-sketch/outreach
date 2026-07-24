import { NextResponse } from "next/server";
import { getConnection, setConnectionLinkedinCredentials } from "@/lib/connections/store";
import { createLoginAttempt } from "@/lib/connections/login-store";
import { hasEncryptionKey } from "@/lib/crypto";
import { hasSupabaseAuthConfig } from "@/lib/supabase/user";

type Params = { params: Promise<{ id: string }> };

// Starts (or restarts) an automated LinkedIn login for this connection.
// First call must include { email, password }; a later re-login can omit
// both and reuse the credentials saved from the first attempt.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }

  // Encryption only actually happens in the Supabase-backed path (see
  // src/lib/connections/store.ts) — local-file dev doesn't need the key.
  if (hasSupabaseAuthConfig() && !hasEncryptionKey()) {
    return NextResponse.json(
      { error: "CONNECTION_ENCRYPTION_KEY non configurata sul server — impostala prima di salvare credenziali LinkedIn." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };

  if (body.email && body.password) {
    await setConnectionLinkedinCredentials(id, body.email, body.password);
  } else if (!connection.linkedinEmail || !connection.linkedinPasswordEncrypted) {
    return NextResponse.json({ error: "email e password sono obbligatorie per il primo accesso" }, { status: 400 });
  }

  const attempt = await createLoginAttempt(id);
  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
