import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseUserClient, hasSupabaseAuthConfig } from "@/lib/supabase/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/auth/superadmin";
import ImpersonateButton from "./ImpersonateButton";

export default async function AdminUsersPage() {
  if (!hasSupabaseAuthConfig()) notFound();

  const userClient = await createSupabaseUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!isSuperadminEmail(user?.email)) notFound();

  const t = await getTranslations("Admin");
  const admin = createSupabaseServerClient();

  const [{ data: usersPage }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, created_at, onboarding_completed"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const rows = (usersPage?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      provider: u.app_metadata?.provider ?? "—",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      onboardingCompleted: profileById.get(u.id)?.onboarding_completed ?? false,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("subtitle", { count: rows.length })}</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t("email")}</th>
              <th className="px-4 py-2.5 font-medium">{t("provider")}</th>
              <th className="px-4 py-2.5 font-medium">{t("joined")}</th>
              <th className="px-4 py-2.5 font-medium">{t("lastSignIn")}</th>
              <th className="px-4 py-2.5 font-medium">{t("onboarded")}</th>
              <th className="px-4 py-2.5 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {row.email}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{row.provider}</td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {row.lastSignInAt ? new Date(row.lastSignInAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.onboardingCompleted
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {row.onboardingCompleted ? t("yes") : t("no")}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {row.id !== user?.id && <ImpersonateButton userId={row.id} email={row.email} />}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
