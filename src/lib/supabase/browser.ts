import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client — only needed for signInWithOAuth (the
// redirect has to be kicked off from the browser), everything else in this
// app goes through the server-side user-scoped/admin clients instead.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
