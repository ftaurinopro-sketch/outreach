"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function DeleteUserButton({
  userId,
  email,
  redirectAfter,
}: {
  userId: string;
  email: string;
  redirectAfter?: string;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t("deleteConfirm", { email }))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      if (redirectAfter) {
        router.push(redirectAfter);
      }
      router.refresh();
      return;
    }
    setLoading(false);
    alert(t("deleteError"));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? "…" : t("deleteUser")}
    </button>
  );
}
