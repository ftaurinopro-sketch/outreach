"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Eliminare questa campagna? L'azione non è reversibile.")) return;
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
      {deleting ? "Eliminazione..." : "Elimina campagna"}
    </button>
  );
}
