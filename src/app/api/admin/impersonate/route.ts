import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/auth/superadmin";

export async function POST(request: Request) {
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

  const { userId } = await request.json();
  if (!userId || userId === caller.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const admin = createSupabaseServerClient();
  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  const targetEmail = targetData?.user?.email;
  if (targetError || !targetEmail) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
  });
  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: "Could not start impersonation" }, { status: 500 });
  }

  const { error: verifyError } = await userClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) {
    return NextResponse.json({ error: "Could not start impersonation" }, { status: 500 });
  }

  await admin.from("admin_audit_log").insert({
    actor_id: caller.id,
    actor_email: caller.email,
    action: "impersonate",
    target_id: userId,
    target_email: targetEmail,
  });

  const cookieStore = await cookies();
  cookieStore.set("impersonator_email", caller.email ?? "", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return NextResponse.json({ ok: true });
}
