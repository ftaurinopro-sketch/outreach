"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const t = useTranslations("DeleteListButton");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(t("confirm"))) return;
    setDeleting(true);
    try {
      await fetch(`/api/lead-lists/${listId}`, { method: "DELETE" });
      router.push("/lead-finder");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {deleting ? t("deleting") : t("deleteList")}
    </button>
  );
}
