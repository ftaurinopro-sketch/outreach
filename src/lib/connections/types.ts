export type Connection = {
  id: string;
  createdAt: string;
  userId: string | null;
  label: string;
  token: string;
  // LinkedIn's li_at session cookie value. Grants full access to the
  // account it belongs to — handle it like a password. Used by the runner
  // (see runner/) to authenticate a headless browser as "another device",
  // not stored/used anywhere in the browser-extension flow. Encrypted at
  // rest (src/lib/crypto.ts) — always plaintext on this in-memory type.
  sessionCookie: string | null;
  // Set when the user chose the automated email/password login instead of
  // pasting a cookie manually. Password is encrypted at rest and is never
  // decrypted back onto this type — only a dedicated internal store
  // function (used solely by the login-job hand-off to the runner) can
  // read it back in plaintext.
  linkedinEmail: string | null;
  linkedinPasswordEncrypted: string | null;
  dailyConnectionLimit: number;
  weeklyConnectionLimit: number;
  dailyMessageLimit: number;
  lastSeenAt: string | null;
  status: ConnectionStatus;
};

// active = runner processes this account normally. paused = the user
// stepped back temporarily (e.g. noticed unusual LinkedIn activity) without
// losing the saved session; disabled is the same effect, framed as a more
// deliberate "stop using this account." Either way, the runner is simply
// never told about the connection — see listAllConnectionTokens in
// store.ts, which only returns 'active' rows — so nothing needs to check
// this status at execution time, it can't reach the runner in the first
// place.
export const CONNECTION_STATUSES = ["active", "paused", "disabled"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

// Connection fields ever safe to send to the browser. Excludes the bearer
// token (only returned once, at creation), the LinkedIn session cookie, and
// the encrypted password — none of which the client has any legitimate
// reason to receive back.
export type PublicConnection = Omit<Connection, "token" | "sessionCookie" | "linkedinPasswordEncrypted"> & {
  hasSessionCookie: boolean;
};

export function toPublicConnection(connection: Connection): PublicConnection {
  return {
    id: connection.id,
    createdAt: connection.createdAt,
    userId: connection.userId,
    label: connection.label,
    linkedinEmail: connection.linkedinEmail,
    hasSessionCookie: Boolean(connection.sessionCookie),
    dailyConnectionLimit: connection.dailyConnectionLimit,
    weeklyConnectionLimit: connection.weeklyConnectionLimit,
    dailyMessageLimit: connection.dailyMessageLimit,
    lastSeenAt: connection.lastSeenAt,
    status: connection.status,
  };
}

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

export function isConnectionOnline(connection: { lastSeenAt: string | null }): boolean {
  if (!connection.lastSeenAt) return false;
  return Date.now() - new Date(connection.lastSeenAt).getTime() < 5 * 60 * 1000;
}

export type LoginAttemptStatus = "pending" | "in_progress" | "awaiting_verification" | "success" | "failed";

export type LoginAttempt = {
  id: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  status: LoginAttemptStatus;
  // The prompt LinkedIn showed (e.g. "Enter the code we sent to fr***@gmail.com"),
  // surfaced to the user so they know what to check.
  verificationPrompt: string | null;
  // Set by the user via the verify endpoint; consumed by the runner while
  // it's waiting inside the still-open browser session.
  verificationCode: string | null;
  error: string | null;
};
