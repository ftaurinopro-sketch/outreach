"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function BillingActions({ userId }: { userId: string }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string, extra?: Record<string, unknown>) {
    setLoading(action);
    await fetch(`/api/admin/users/${userId}/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <input
        type="number"
        min={1}
        max={365}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="w-14 rounded-md border border-neutral-300 px-1.5 py-1 text-xs"
      />
      <button
        onClick={() => run("extend_trial", { days })}
        disabled={!!loading || days < 1}
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
