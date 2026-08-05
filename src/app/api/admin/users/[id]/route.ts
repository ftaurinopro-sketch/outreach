import { NextResponse } from "next/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminUser } from "@/lib/auth/superadmin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
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
  if (id === caller.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const admin = createSupabaseServerClient();
  const { data: targetData } = await admin.auth.admin.getUserById(id);
  const targetEmail = targetData?.user?.email ?? null;

  // profiles.id -> auth.users(id) on delete cascade, and every owned table
  // (agents, lead_lists, campaigns, connections, automation_actions,
  // scrape_jobs) cascades from there too — deleting the auth user is enough
  // to clean up everything belonging to them.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }

  await admin.from("admin_audit_log").insert({
    actor_id: caller.id,
    actor_email: caller.email,
    action: "delete_user",
    target_id: null,
    target_email: targetEmail,
  });

  return NextResponse.json({ ok: true });
}
