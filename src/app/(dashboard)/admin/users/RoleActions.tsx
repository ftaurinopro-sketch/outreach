"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function RoleActions({ userId, role }: { userId: string; role: "user" | "superadmin" }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setRole(next: "user" | "superadmin") {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={() => setRole(role === "superadmin" ? "user" : "superadmin")}
      disabled={loading}
      className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
    >
      {loading ? "…" : role === "superadmin" ? t("demoteToUser") : t("promoteToSuperadmin")}
    </button>
  );
}
