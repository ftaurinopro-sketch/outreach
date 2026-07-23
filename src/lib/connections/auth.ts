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
