import { NextResponse } from "next/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";

export async function POST(request: Request) {
  // Sidebar always renders the sign-out button, even in local-file-fallback
  // mode (no Supabase configured, so there's no session to sign out of) —
  // without this check, creating a Supabase client with an empty URL/key
  // throws and this route 500s instead of just sending you home.
  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
