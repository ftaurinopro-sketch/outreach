"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const t = useTranslations("DeleteCampaignButton");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(t("confirm"))) return;
    setDeleting(true);
    try {
      await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      router.push("/campaigns");
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
      {deleting ? t("deleting") : t("deleteCampaign")}
    </button>
  );
}
