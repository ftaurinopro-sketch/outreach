import { NextResponse } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/user";

export async function POST(request: Request) {
  const supabase = await createSupabaseUserClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
