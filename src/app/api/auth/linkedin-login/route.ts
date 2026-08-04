import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import {
  createConnection,
  listConnections,
  setConnectionLinkedinCredentials,
} from "@/lib/connections/store";
import { createLoginAttempt } from "@/lib/connections/login-store";
import { DEFAULT_CONNECTION_LIMITS } from "@/lib/connections/types";
import { deriveAppPassword, hasAppPasswordSecret, hasEncryptionKey } from "@/lib/crypto";

// The single "log in with LinkedIn" entry point: one submission both
// authenticates into ReachOS (creating the account on first use) and starts
// the LinkedIn automation login. The user only ever sees/types their
// LinkedIn credentials — the Supabase Auth password behind the scenes is a
// synthetic value derived from the email (see deriveAppPassword), never
// shown or based on the LinkedIn password itself.
//
// Security note: this treats "knows this LinkedIn email + password" as
// sufficient proof of ReachOS account ownership for that email — there is
// no separate email verification step. Fine for a single-operator setup;
// would need real email verification before this app has other, mutually
// untrusted users sharing the same Supabase project.
export async function POST(request: Request) {
  if (!hasSupabaseAuthConfig() || !hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase non configurato — il login unificato richiede Supabase Auth attivo." },
      { status: 503 }
    );
  }
  if (!hasAppPasswordSecret()) {
    return NextResponse.json(
      { error: "APP_PASSWORD_DERIVATION_SECRET non configurata sul server." },
      { status: 503 }
    );
  }
  if (!hasEncryptionKey()) {
    return NextResponse.json(
      { error: "CONNECTION_ENCRYPTION_KEY non configurata sul server." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email e password sono obbligatorie" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const appPassword = deriveAppPassword(email);

  const admin = createSupabaseServerClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password: appPassword,
    email_confirm: true,
  });
  if (createErr) {
    const alreadyExists = /already.*(registered|exists)/i.test(createErr.message);
    if (!alreadyExists) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    // Account already exists for this email — keep its Supabase password in
    // sync with the derived one so this flow can always sign back in.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, { password: appPassword });
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }
  }

  const supabase = await createSupabaseUserClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: appPassword });
  if (signInErr) {
    return NextResponse.json({ error: "Accesso non riuscito" }, { status: 500 });
  }

  // From here on the request's session cookies carry the new login, so the
  // usual user-scoped (RLS) store functions work for the rest of this call.
  const connections = await listConnections();
  let connection =
    connections.find((c) => c.linkedinEmail?.toLowerCase() === email) ?? connections[0] ?? null;
  if (!connection) {
    connection = await createConnection({ ...DEFAULT_CONNECTION_LIMITS, label: email });
  }

  await setConnectionLinkedinCredentials(connection.id, email, body.password);
  const attempt = await createLoginAttempt(connection.id);

  return NextResponse.json({ connectionId: connection.id, attemptId: attempt.id }, { status: 201 });
}
