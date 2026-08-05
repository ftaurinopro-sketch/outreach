import { getConnectionByToken, touchConnection } from "./store";
import type { Connection } from "./types";

// Authenticates a request from the browser extension via
// `Authorization: Bearer <token>` and records a heartbeat (last_seen_at)
// so the Connections page can show online/offline status.
export async function authenticateExtension(request: Request): Promise<Connection | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const connection = await getConnectionByToken(token);
  if (!connection) return null;

  await touchConnection(connection.id);
  return connection;
}

// A single shared secret for the platform's cloud runner — unlike
// authenticateExtension above, this isn't scoped to one connection: it lets
// the runner list every connection across every tenant so one always-on
// process can service all of them, instead of requiring each user to run
// their own runner locally. Only ever compared against RUNNER_MASTER_KEY,
// never stored or looked up per-tenant.
export function authenticateRunnerMaster(request: Request): boolean {
  const key = process.env.RUNNER_MASTER_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token === key;
}
