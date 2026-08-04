import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { isSuperadminEmail } from "@/lib/auth/superadmin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let isSuperadmin = false;
  let impersonatingAs: string | null = null;
  let impersonatorEmail: string | null = null;

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        redirect("/onboarding");
      }
    }
  }

  const t = impersonatingAs ? await getTranslations("Admin") : null;

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
