import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function hasSupabaseAuthConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// User-scoped Supabase client for Server Components / Route Handlers: reads
// the caller's auth session from cookies and uses the anon key, so every
// query goes through Postgres RLS (auth.uid() = user_id) instead of the
// service-role admin client in server.ts, which bypasses RLS entirely.
// This is what every regular (browser-originated) data access should use;
// the service-role client stays reserved for the /api/extension/* routes,
// which authenticate via their own bearer token, not a Supabase session.
export async function createSupabaseUserClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — proxy.ts refreshes
            // the session cookie on the next request instead.
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = await createSupabaseUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Convenience for the handful of places (scrape_jobs) that need a plain user
// id string rather than the full Supabase user object — falls back to a
// fixed placeholder in local-file dev mode, where there's no real login.
export async function getCurrentUserId(): Promise<string> {
  if (!hasSupabaseAuthConfig()) return "local";
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}
