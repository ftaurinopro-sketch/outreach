export type Connection = {
  id: string;
  createdAt: string;
  userId: string | null;
  label: string;
  token: string;
  // LinkedIn's li_at session cookie value. Grants full access to the
  // account it belongs to — handle it like a password. Used by the runner
  // (see runner/) to authenticate a headless browser as "another device",
  // not stored/used anywhere in the browser-extension flow.
  sessionCookie: string | null;
  dailyConnectionLimit: number;
  weeklyConnectionLimit: number;
  dailyMessageLimit: number;
  lastSeenAt: string | null;
};

export type ConnectionInput = {
  label: string;
  dailyConnectionLimit: number;
  weeklyConnectionLimit: number;
  dailyMessageLimit: number;
};

// LinkedIn's own recommended ceiling is ~200 connection requests/week for a
// healthy account — the platform spreads these across the week to simulate
// human pacing rather than sending them all at once (see
// src/lib/automation/scheduler.ts).
export const DEFAULT_CONNECTION_LIMITS: ConnectionInput = {
  label: "",
  dailyConnectionLimit: 30,
  weeklyConnectionLimit: 200,
  dailyMessageLimit: 40,
};

export function isConnectionOnline(connection: Connection): boolean {
  if (!connection.lastSeenAt) return false;
  return Date.now() - new Date(connection.lastSeenAt).getTime() < 5 * 60 * 1000;
}
