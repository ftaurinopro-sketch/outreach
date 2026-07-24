import { randomUUID, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { Connection, ConnectionInput } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "connections.json");

async function readLocalFile(): Promise<Connection[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Connection[];
  } catch {
    return [];
  }
}

async function writeLocalFile(connections: Connection[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(connections, null, 2), "utf-8");
}

type ConnectionRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  label: string;
  token: string;
  session_cookie: string | null;
  linkedin_email: string | null;
  linkedin_password_encrypted: string | null;
  daily_connection_limit: number;
  weekly_connection_limit: number;
  daily_message_limit: number;
  last_seen_at: string | null;
};

// The DB/JSON-file row always holds sessionCookie ciphertext; every function
// that returns a Connection to application code decrypts it here so the rest
// of the codebase can keep treating Connection.sessionCookie as plaintext,
// same as before this field was encrypted at rest. The password field is the
// opposite: it stays encrypted even on the in-memory Connection type, since
// (unlike the cookie) almost nothing needs it in plaintext — only the
// login-job hand-off does, via getConnectionCredentialsForLogin below.
function fromRow(row: ConnectionRow): Connection {
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    label: row.label,
    token: row.token,
    sessionCookie: row.session_cookie ? decryptSecret(row.session_cookie) : null,
    linkedinEmail: row.linkedin_email,
    linkedinPasswordEncrypted: row.linkedin_password_encrypted,
    dailyConnectionLimit: row.daily_connection_limit,
    weeklyConnectionLimit: row.weekly_connection_limit,
    dailyMessageLimit: row.daily_message_limit,
    lastSeenAt: row.last_seen_at,
  };
}

export async function listConnections(): Promise<Connection[]> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ConnectionRow[]).map(fromRow);
  }
  const connections = await readLocalFile();
  return [...connections].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getConnection(id: string): Promise<Connection | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase.from("connections").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ConnectionRow) : null;
  }
  const connections = await readLocalFile();
  return connections.find((c) => c.id === id) ?? null;
}

// Extension/runner auth (bearer token, no Supabase session) — must use the
// admin client since RLS on `connections` requires auth.uid(), which isn't
// set for these requests.
export async function getConnectionByToken(token: string): Promise<Connection | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("connections").select("*").eq("token", token).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ConnectionRow) : null;
  }
  const connections = await readLocalFile();
  return connections.find((c) => c.token === token) ?? null;
}

export async function createConnection(input: ConnectionInput): Promise<Connection> {
  const connection: Connection = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    userId: null,
    label: input.label,
    token: randomBytes(24).toString("base64url"),
    sessionCookie: null,
    linkedinEmail: null,
    linkedinPasswordEncrypted: null,
    dailyConnectionLimit: input.dailyConnectionLimit,
    weeklyConnectionLimit: input.weeklyConnectionLimit,
    dailyMessageLimit: input.dailyMessageLimit,
    lastSeenAt: null,
  };

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("connections")
      .insert({
        id: connection.id,
        created_at: connection.createdAt,
        label: connection.label,
        token: connection.token,
        session_cookie: null,
        linkedin_email: null,
        linkedin_password_encrypted: null,
        daily_connection_limit: connection.dailyConnectionLimit,
        weekly_connection_limit: connection.weeklyConnectionLimit,
        daily_message_limit: connection.dailyMessageLimit,
        last_seen_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as ConnectionRow);
  }

  const connections = await readLocalFile();
  connections.push(connection);
  await writeLocalFile(connections);
  return connection;
}

// Encryption only applies to the Supabase-backed path: the local-JSON
// fallback is zero-config local dev (same as every other store in this
// codebase — leads, campaigns, agents — none of which encrypt anything on
// disk), so it stores these secrets as-is rather than forcing every local
// dev session to set CONNECTION_ENCRYPTION_KEY just to paste a cookie.
export async function updateConnectionSessionCookie(
  id: string,
  sessionCookie: string
): Promise<Connection | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("connections")
      .update({ session_cookie: encryptSecret(sessionCookie) })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ConnectionRow) : null;
  }

  const connections = await readLocalFile();
  const idx = connections.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  connections[idx].sessionCookie = sessionCookie;
  await writeLocalFile(connections);
  return connections[idx];
}

// Called from the user-session-authenticated "log in with LinkedIn" route.
// See the comment above updateConnectionSessionCookie re: local vs. Supabase.
export async function setConnectionLinkedinCredentials(
  id: string,
  email: string,
  password: string
): Promise<Connection | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("connections")
      .update({ linkedin_email: email, linkedin_password_encrypted: encryptSecret(password) })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ConnectionRow) : null;
  }

  const connections = await readLocalFile();
  const idx = connections.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  connections[idx].linkedinEmail = email;
  connections[idx].linkedinPasswordEncrypted = password;
  await writeLocalFile(connections);
  return connections[idx];
}

// The one place the LinkedIn password is ever decrypted back to plaintext —
// used only when handing a login job to the runner (bearer-token/admin-client
// context, same trust boundary the li_at cookie itself already crosses over
// this same channel). Never call this from a user-session-authenticated
// route; those should only ever see linkedinEmail / hasSessionCookie.
export async function getConnectionCredentialsForLogin(
  connectionId: string
): Promise<{ email: string; password: string } | null> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .maybeSingle();
    if (error) throw error;
    const connection = data ? fromRow(data as ConnectionRow) : null;
    if (!connection?.linkedinEmail || !connection.linkedinPasswordEncrypted) return null;
    return { email: connection.linkedinEmail, password: decryptSecret(connection.linkedinPasswordEncrypted) };
  }

  const connection = (await readLocalFile()).find((c) => c.id === connectionId) ?? null;
  if (!connection?.linkedinEmail || !connection.linkedinPasswordEncrypted) return null;
  // Local-file mode stores the password as-is (see comment above) — no
  // decryption needed here, it was never encrypted.
  return { email: connection.linkedinEmail, password: connection.linkedinPasswordEncrypted };
}

// Extension heartbeat (bearer token, no Supabase session) — admin client.
export async function touchConnection(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("connections").update({ last_seen_at: now }).eq("id", id);
    if (error) throw error;
    return;
  }
  const connections = await readLocalFile();
  const idx = connections.findIndex((c) => c.id === id);
  if (idx !== -1) {
    connections[idx].lastSeenAt = now;
    await writeLocalFile(connections);
  }
}

export async function deleteConnection(id: string): Promise<void> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.from("connections").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const connections = await readLocalFile();
  await writeLocalFile(connections.filter((c) => c.id !== id));
}
