import { NextResponse } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/user";

// Handles both the Google OAuth redirect and the email-confirmation link
// (Supabase sends a `code` param in both cases, exchanged here for a
// session cookie via PKCE).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
