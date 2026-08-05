import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail, isSuperadminUser } from "@/lib/auth/superadmin";
import ImpersonateButton from "../ImpersonateButton";
import BillingActions from "../BillingActions";
import RoleActions from "../RoleActions";
import DeleteUserButton from "../DeleteUserButton";

type Params = { params: Promise<{ id: string }> };

const STATUS_STYLES: Record<string, string> = {
  trialing: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-red-50 text-red-700",
  canceled: "bg-neutral-100 text-neutral-600",
};

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: Params) {
  if (!hasSupabaseAuthConfig()) notFound();

  const userClient = await createSupabaseUserClient();
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  const { data: callerProfile } = caller
    ? await userClient.from("profiles").select("role").eq("id", caller.id).maybeSingle()
    : { data: null };
  if (!isSuperadminUser(caller?.email, callerProfile?.role)) notFound();

  const { id } = await params;
  const t = await getTranslations("Admin");
  const admin = createSupabaseServerClient();

  const [
    { data: targetData },
    { data: profile },
    { data: agents },
    { data: leadLists },
    { data: campaigns },
    { data: connections },
    { data: actions },
  ] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin
      .from("profiles")
      .select("onboarding_completed, trial_ends_at, subscription_status, role")
      .eq("id", id)
      .maybeSingle(),
    admin.from("agents").select("id, config, created_at").eq("user_id", id),
    admin.from("lead_lists").select("id, name, leads, created_at").eq("user_id", id),
    admin.from("campaigns").select("id, status, config, created_at").eq("user_id", id),
    admin.from("connections").select("id, label, session_cookie, last_seen_at, created_at").eq("user_id", id),
    admin.from("automation_actions").select("type, status").eq("user_id", id),
  ]);

  const targetUser = targetData?.user;
  if (!targetUser) notFound();

  const totalLeads = (leadLists ?? []).reduce(
    (sum, l) => sum + (Array.isArray(l.leads) ? l.leads.length : 0),
    0
  );
  const activeConnections = (connections ?? []).filter((c) => c.session_cookie).length;
  const doneActions = (actions ?? []).filter((a) => a.status === "done");
  const connectionRequestsSent = doneActions.filter((a) => a.type === "send_connection_request").length;
  const messagesSent = doneActions.filter((a) => a.type === "send_message").length;

  const subscriptionStatus = profile?.subscription_status ?? "trialing";
  const trialEndsAt = profile?.trial_ends_at ?? null;
  const isRootSuperadmin = isSuperadminEmail(targetUser.email);
  const isTargetSuperadmin = isRootSuperadmin || profile?.role === "superadmin";

  return (
    <div className="p-6">
      <Link href="/admin/users" className="text-sm text-neutral-400 hover:text-neutral-700">
        {t("backToUsers")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{targetUser.email}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t("provider")}: {targetUser.app_metadata?.provider ?? "—"} · {t("joined")}{" "}
            {new Date(targetUser.created_at).toLocaleDateString()} · {t("lastSignIn")}{" "}
            {targetUser.last_sign_in_at ? new Date(targetUser.last_sign_in_at).toLocaleDateString() : "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                profile?.onboarding_completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {t("onboarded")}: {profile?.onboarding_completed ? t("yes") : t("no")}
            </span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                isTargetSuperadmin ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {isTargetSuperadmin ? t("roleSuperadmin") : t("roleUser")}
            </span>
            {targetUser.id !== caller?.id && !isRootSuperadmin && (
              <RoleActions userId={targetUser.id} role={isTargetSuperadmin ? "superadmin" : "user"} />
            )}
          </div>
        </div>
        {targetUser.id !== caller?.id && (
          <ImpersonateButton userId={targetUser.id} email={targetUser.email ?? ""} />
        )}
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("plan")}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[subscriptionStatus] ?? STATUS_STYLES.trialing
                }`}
              >
                {t(`status.${subscriptionStatus}`)}
              </span>
              {trialEndsAt && (
                <span className="text-xs text-neutral-500">
                  {t("trialEndsOn", { date: new Date(trialEndsAt).toLocaleDateString() })}
                </span>
              )}
            </div>
          </div>
          <BillingActions userId={targetUser.id} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("statAgents")} value={agents?.length ?? 0} />
        <StatCard label={t("statLeadLists")} value={leadLists?.length ?? 0} />
        <StatCard label={t("statTotalLeads")} value={totalLeads} />
        <StatCard label={t("statCampaigns")} value={campaigns?.length ?? 0} />
        <StatCard
          label={t("statConnections")}
          value={`${activeConnections}/${connections?.length ?? 0}`}
        />
        <StatCard label={t("statConnectionRequestsSent")} value={connectionRequestsSent} />
        <StatCard label={t("statMessagesSent")} value={messagesSent} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium text-neutral-900">{t("sectionCampaigns")}</h2>
          <ul className="mt-3 space-y-2">
            {(campaigns ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {(c.config as { name?: string } | null)?.name ?? c.id}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    CAMPAIGN_STATUS_STYLES[c.status] ?? CAMPAIGN_STATUS_STYLES.draft
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <li className="text-sm text-neutral-400">{t("noneYet")}</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium text-neutral-900">{t("sectionAgents")}</h2>
          <ul className="mt-3 space-y-2">
            {(agents ?? []).map((a) => (
              <li key={a.id} className="text-sm text-neutral-700">
                {(a.config as { name?: string } | null)?.name ?? a.id}
              </li>
            ))}
            {(!agents || agents.length === 0) && <li className="text-sm text-neutral-400">{t("noneYet")}</li>}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium text-neutral-900">{t("sectionLeadLists")}</h2>
          <ul className="mt-3 space-y-2">
            {(leadLists ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{l.name}</span>
                <span className="text-neutral-400">{Array.isArray(l.leads) ? l.leads.length : 0}</span>
              </li>
            ))}
            {(!leadLists || leadLists.length === 0) && (
              <li className="text-sm text-neutral-400">{t("noneYet")}</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium text-neutral-900">{t("sectionConnections")}</h2>
          <ul className="mt-3 space-y-2">
            {(connections ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{c.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.session_cookie ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {c.session_cookie ? t("yes") : t("no")}
                </span>
              </li>
            ))}
            {(!connections || connections.length === 0) && (
              <li className="text-sm text-neutral-400">{t("noneYet")}</li>
            )}
          </ul>
        </section>
      </div>

      {targetUser.id !== caller?.id && !isRootSuperadmin && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-800">{t("dangerZone")}</p>
          <p className="mt-1 text-xs text-red-700">{t("dangerZoneDescription")}</p>
          <div className="mt-3">
            <DeleteUserButton userId={targetUser.id} email={targetUser.email ?? ""} redirectAfter="/admin/users" />
          </div>
        </div>
      )}
    </div>
  );
}
