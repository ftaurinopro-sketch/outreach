"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CampaignStatus } from "@/lib/campaigns/types";

export default function PauseResumeCampaignButton({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const t = useTranslations("PauseResumeCampaignButton");
  const [busy, setBusy] = useState(false);

  if (status !== "active" && status !== "paused") return null;

  async function handleToggle() {
    setBusy(true);
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: status === "active" ? "pause" : "resume" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {status === "active" ? (busy ? t("pausing") : t("pause")) : busy ? t("resuming") : t("resume")}
    </button>
  );
}
