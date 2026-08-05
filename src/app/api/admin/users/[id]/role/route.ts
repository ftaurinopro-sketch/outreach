import { NextResponse } from "next/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminUser } from "@/lib/auth/superadmin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!hasSupabaseAuthConfig()) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const userClient = await createSupabaseUserClient();
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: callerProfile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (!isSuperadminUser(caller.email, callerProfile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // Changing your own role from this UI could lock you out with no way
  // back in (unless your email is also in the SUPERADMIN_EMAILS root list)
  // — force that change to happen via the env var instead.
  if (id === caller.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const { role } = (await request.json().catch(() => ({}))) as { role?: string };
  if (role !== "user" && role !== "superadmin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createSupabaseServerClient();
  await admin.from("profiles").update({ role }).eq("id", id);
  await admin.from("admin_audit_log").insert({
    actor_id: caller.id,
    actor_email: caller.email,
    action: `role:set_${role}`,
    target_id: id,
  });

  return NextResponse.json({ ok: true });
}
