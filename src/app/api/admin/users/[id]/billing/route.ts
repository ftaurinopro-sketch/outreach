import { NextResponse } from "next/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/auth/superadmin";
import { TRIAL_EXTEND_DAYS } from "@/lib/billing/subscription";

type Params = { params: Promise<{ id: string }> };
type Action = "extend_trial" | "set_active" | "set_expired";
const VALID_ACTIONS: Action[] = ["extend_trial", "set_active", "set_expired"];
const MAX_EXTEND_DAYS = 365;

export async function POST(request: Request, { params }: Params) {
  if (!hasSupabaseAuthConfig()) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const userClient = await createSupabaseUserClient();
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  if (!caller || !isSuperadminEmail(caller.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, days } = (await request.json().catch(() => ({}))) as { action?: string; days?: number };
  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createSupabaseServerClient();

  if (action === "extend_trial") {
    const extendBy =
      typeof days === "number" && Number.isFinite(days) && days >= 1 && days <= MAX_EXTEND_DAYS
        ? Math.floor(days)
        : TRIAL_EXTEND_DAYS;
    const { data: profile } = await admin
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", id)
      .maybeSingle();
    const base =
      profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
        ? new Date(profile.trial_ends_at)
        : new Date();
    base.setDate(base.getDate() + extendBy);
    await admin
      .from("profiles")
      .update({ trial_ends_at: base.toISOString(), subscription_status: "trialing" })
      .eq("id", id);
  } else if (action === "set_active") {
    await admin.from("profiles").update({ subscription_status: "active" }).eq("id", id);
  } else {
    await admin.from("profiles").update({ subscription_status: "expired" }).eq("id", id);
  }

  await admin.from("admin_audit_log").insert({
    actor_id: caller.id,
    actor_email: caller.email,
    action: `billing:${action}`,
    target_id: id,
  });

  return NextResponse.json({ ok: true });
}
