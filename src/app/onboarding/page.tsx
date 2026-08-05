import { redirect } from "next/navigation";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { listConnections } from "@/lib/connections/store";
import { toPublicConnection } from "@/lib/connections/types";
import { isSuperadminUser } from "@/lib/auth/superadmin";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  let defaultLinkedinEmail: string | undefined;

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, role")
        .eq("id", user.id)
        .maybeSingle();
      if (isSuperadminUser(user.email, profile?.role) || profile?.onboarding_completed) {
        redirect("/");
      }
      defaultLinkedinEmail = user.email ?? undefined;
    }
  }

  const connections = await listConnections();

  return (
    <OnboardingFlow
      initialConnections={connections.map(toPublicConnection)}
      defaultLinkedinEmail={defaultLinkedinEmail}
    />
  );
}
