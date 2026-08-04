import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { isSuperadminEmail } from "@/lib/auth/superadmin";
import { isAccessBlocked } from "@/lib/billing/subscription";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let isSuperadmin = false;
  let impersonatingAs: string | null = null;
  let impersonatorEmail: string | null = null;
  let trialBlocked = false;

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isSuperadmin = isSuperadminEmail(user.email);
      const cookieStore = await cookies();
      impersonatorEmail = cookieStore.get("impersonator_email")?.value ?? null;
      if (impersonatorEmail) impersonatingAs = user.email ?? null;
      // Superadmins manage the platform, they don't run campaigns — skip the
      // "connect LinkedIn / build an AI assistant" onboarding meant for
      // regular users. Same exemption while impersonating someone, so
      // support access isn't blocked by the target's own trial state.
      if (!isSuperadmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, trial_ends_at, subscription_status")
          .eq("id", user.id)
          .maybeSingle();
        if (
          !impersonatingAs &&
          profile &&
          isAccessBlocked({
            subscriptionStatus: profile.subscription_status,
            trialEndsAt: profile.trial_ends_at,
          })
        ) {
          trialBlocked = true;
        } else if (!profile?.onboarding_completed) {
          redirect("/onboarding");
        }
      }
    }
  }

  const t = impersonatingAs ? await getTranslations("Admin") : null;
  const tBilling = trialBlocked ? await getTranslations("Billing") : null;

  if (trialBlocked && tBilling) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">{tBilling("trialExpiredTitle")}</h1>
          <p className="mt-2 text-sm text-neutral-500">{tBilling("trialExpiredBody")}</p>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {tBilling("signOut")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      {impersonatingAs && t && (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span>{t("impersonationBanner", { email: impersonatingAs, admin: impersonatorEmail ?? "" })}</span>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="rounded-md bg-white/20 px-2.5 py-1 text-xs hover:bg-white/30">
              {t("exitImpersonation")}
            </button>
          </form>
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar isSuperadmin={isSuperadmin} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
