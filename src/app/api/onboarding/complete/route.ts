import { NextResponse } from "next/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";

export async function POST() {
  if (!hasSupabaseAuthConfig()) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createSupabaseUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, onboarding_completed: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
