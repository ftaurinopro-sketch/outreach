export type Connection = {
  id: string;
  createdAt: string;
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

// Conservative defaults matching the plan's guardrails (§1.2): the platform
// we modeled this on recommends 150-180 connection requests/week, leaving
// room for manual ones — we start lower until this has been tested for real.
export const DEFAULT_CONNECTION_LIMITS: ConnectionInput = {
  label: "",
  dailyConnectionLimit: 15,
  weeklyConnectionLimit: 80,
  dailyMessageLimit: 30,
};

export function isConnectionOnline(connection: Connection): boolean {
  if (!connection.lastSeenAt) return false;
  return Date.now() - new Date(connection.lastSeenAt).getTime() < 5 * 60 * 1000;
}
