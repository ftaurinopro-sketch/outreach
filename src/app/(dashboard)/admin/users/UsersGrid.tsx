"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ImpersonateButton from "./ImpersonateButton";
import RoleActions from "./RoleActions";
import DeleteUserButton from "./DeleteUserButton";

export type AdminUserRow = {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
  onboardingCompleted: boolean;
  isSuperadmin: boolean;
  isRootSuperadmin: boolean;
  subscriptionStatus: string;
};

const STATUS_STYLES: Record<string, string> = {
  trialing: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-red-50 text-red-700",
  canceled: "bg-neutral-100 text-neutral-600",
};

export default function UsersGrid({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  currentUserId: string | null;
}) {
  const t = useTranslations("Admin");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-indigo-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {row.email.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="block truncate text-sm font-medium text-neutral-900 hover:text-indigo-600 hover:underline"
                  >
                    {row.email}
                  </Link>
                  <p className="text-xs text-neutral-400">{row.provider}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.isSuperadmin ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {row.isSuperadmin ? t("roleSuperadmin") : t("roleUser")}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-neutral-500">
              <div>
                {t("joined")}: {new Date(row.createdAt).toLocaleDateString()}
              </div>
              <div>
                {t("lastSignIn")}: {row.lastSignInAt ? new Date(row.lastSignInAt).toLocaleDateString() : "—"}
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.onboardingCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {t("onboarded")}: {row.onboardingCompleted ? t("yes") : t("no")}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[row.subscriptionStatus] ?? STATUS_STYLES.trialing
                }`}
              >
                {t(`status.${row.subscriptionStatus}`)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
              {row.id !== currentUserId && !row.isRootSuperadmin ? (
                <RoleActions userId={row.id} role={row.isSuperadmin ? "superadmin" : "user"} />
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                {row.id !== currentUserId && <ImpersonateButton userId={row.id} email={row.email} />}
                <Link href={`/admin/users/${row.id}`} className="text-xs text-neutral-400 hover:text-neutral-700">
                  {t("viewDetails")}
                </Link>
                {row.id !== currentUserId && !row.isRootSuperadmin && (
                  <DeleteUserButton userId={row.id} email={row.email} />
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-neutral-400">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
