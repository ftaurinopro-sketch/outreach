import { randomUUID, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
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
  daily_connection_limit: number;
  weekly_connection_limit: number;
  daily_message_limit: number;
  last_seen_at: string | null;
};

function fromRow(row: ConnectionRow): Connection {
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    label: row.label,
    token: row.token,
    sessionCookie: row.session_cookie,
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

export async function updateConnectionSessionCookie(
  id: string,
  sessionCookie: string
): Promise<Connection | null> {
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const { data, error } = await supabase
      .from("connections")
      .update({ session_cookie: sessionCookie })
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
