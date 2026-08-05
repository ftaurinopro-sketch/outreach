import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail, isSuperadminUser } from "@/lib/auth/superadmin";
import UsersGrid from "./UsersGrid";

export default async function AdminUsersPage() {
  if (!hasSupabaseAuthConfig()) notFound();

  const userClient = await createSupabaseUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const { data: callerProfile } = user
    ? await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!isSuperadminUser(user?.email, callerProfile?.role)) notFound();

  const t = await getTranslations("Admin");
  const admin = createSupabaseServerClient();

  const [{ data: usersPage }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, created_at, onboarding_completed, role, subscription_status"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const rows = (usersPage?.users ?? [])
    .map((u) => {
      const profile = profileById.get(u.id);
      const isRootSuperadmin = isSuperadminEmail(u.email);
      return {
        id: u.id,
        email: u.email ?? "—",
        provider: u.app_metadata?.provider ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        onboardingCompleted: profile?.onboarding_completed ?? false,
        isSuperadmin: isRootSuperadmin || profile?.role === "superadmin",
        isRootSuperadmin,
        subscriptionStatus: profile?.subscription_status ?? "trialing",
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("subtitle", { count: rows.length })}</p>

      <div className="mt-6">
        <UsersGrid rows={rows} currentUserId={user?.id ?? null} />
      </div>
    </div>
  );
}
