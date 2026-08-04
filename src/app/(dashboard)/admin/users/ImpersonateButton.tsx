"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ImpersonateButton({ userId, email }: { userId: string; email: string }) {
  const t = useTranslations("Admin");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(t("impersonateConfirm", { email }))) return;
    setLoading(true);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setLoading(false);
    alert(t("impersonateError"));
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
    >
      {loading ? t("impersonating") : t("impersonate")}
    </button>
  );
}
