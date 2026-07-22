import { createClient } from "@supabase/supabase-js";

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Server-only client using the service role key. Never import this from a
// client component. Used by the agents store when Supabase env vars are
// configured; until then the store falls back to a local JSON file (see
// src/lib/agents/store.ts) so the app runs with zero setup.
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
