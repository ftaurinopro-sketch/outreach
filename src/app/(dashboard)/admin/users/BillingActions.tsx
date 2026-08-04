"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function BillingActions({ userId }: { userId: string }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string) {
    setLoading(action);
    await fetch(`/api/admin/users/${userId}/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button
        onClick={() => run("extend_trial")}
        disabled={!!loading}
        className="text-indigo-600 hover:underline disabled:opacity-50"
      >
        {loading === "extend_trial" ? "…" : t("extendTrial")}
      </button>
      <button
        onClick={() => run("set_active")}
        disabled={!!loading}
        className="text-emerald-600 hover:underline disabled:opacity-50"
      >
        {loading === "set_active" ? "…" : t("setActive")}
      </button>
      <button
        onClick={() => run("set_expired")}
        disabled={!!loading}
        className="text-red-600 hover:underline disabled:opacity-50"
      >
        {loading === "set_expired" ? "…" : t("setExpired")}
      </button>
    </div>
  );
}
