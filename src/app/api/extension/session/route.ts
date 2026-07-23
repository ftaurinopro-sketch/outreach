import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";

// Used by the cloud runner (runner/) to fetch the LinkedIn session cookie
// (li_at) it should inject into its headless browser context. Never
// returned to anything but the matching connection's own bearer token.
export async function GET(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  if (!connection.sessionCookie) {
    return NextResponse.json(
      { error: "Nessun session cookie configurato per questa connessione. Aggiungilo in /connections." },
      { status: 409 }
    );
  }

  return NextResponse.json({ sessionCookie: connection.sessionCookie });
}
