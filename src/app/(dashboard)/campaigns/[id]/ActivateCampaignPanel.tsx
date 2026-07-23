"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Connection } from "@/lib/connections/types";
import { isConnectionOnline } from "@/lib/connections/types";

export default function ActivateCampaignPanel({
  campaignId,
  connections,
}: {
  campaignId: string;
  connections: Connection[];
}) {
  const router = useRouter();
  const t = useTranslations("ActivateCampaignPanel");
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (connections.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
        {t.rich("needConnection", {
          link: (chunks) => (
            <Link href="/connections" className="text-neutral-900 underline">
              {chunks}
            </Link>
          ),
        })}
      </div>
    );
  }

  async function handleActivate() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("activateError"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
      setActivating(false);
    }
  }

  const selected = connections.find((c) => c.id === connectionId);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h3 className="text-sm font-medium text-neutral-900">{t("title")}</h3>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("linkedinProfile")}</label>
        <select
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} {isConnectionOnline(c) ? `(${t("online")})` : `(${t("offline")})`}
            </option>
          ))}
        </select>
      </div>

      {selected && !isConnectionOnline(selected) && (
        <p className="mt-2 text-xs text-amber-700">{t("offlineWarning")}</p>
      )}

      <label className="mt-3 flex items-start gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        {t("riskAcknowledgement")}
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleActivate}
        disabled={!confirmed || activating}
        className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {activating ? t("activating") : t("activateCampaign")}
      </button>
    </div>
  );
}
