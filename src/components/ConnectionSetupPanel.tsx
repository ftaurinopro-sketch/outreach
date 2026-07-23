"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ConnectionSetupPanel({
  connection,
  onDone,
  onSaved,
}: {
  connection: { id: string; label: string; token: string };
  onDone?: () => void;
  onSaved?: () => void;
}) {
  const t = useTranslations("ConnectionsClient");
  const [cookieValue, setCookieValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveCookie() {
    if (!cookieValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/connections/${connection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie: cookieValue.trim() }),
      });
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-50 p-5">
      <h3 className="text-sm font-medium text-neutral-900">{t("setupTitle", { label: connection.label })}</h3>

      <div className="mt-3">
        <p className="text-xs text-neutral-500">
          {t.rich("setupStep1", {
            strong: (chunks) => <strong>{chunks}</strong>,
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs">
            {connection.token}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(connection.token)}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-xs hover:border-neutral-900"
          >
            {t("copy")}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-neutral-500">
          {t.rich("setupStep2", {
            strong: (chunks) => <strong>{chunks}</strong>,
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={cookieValue}
            onChange={(e) => setCookieValue(e.target.value)}
            placeholder={t("cookiePlaceholder")}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
          <button
            onClick={saveCookie}
            disabled={saving || !cookieValue.trim()}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
        {saved && <p className="mt-1 text-xs text-green-700">{t("cookieSaved")}</p>}
        <p className="mt-2 text-xs text-neutral-500">{t("skipHint")}</p>
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-neutral-500">
        <li>
          {t("setupCliStep1")}{" "}
          <code className="font-mono">cd runner && npm install && npx playwright install chromium</code>
        </li>
        <li>{t.rich("setupCliStep2", { code: (chunks) => <code className="font-mono">{chunks}</code> })}</li>
        <li>{t.rich("setupCliStep3", { code: (chunks) => <code className="font-mono">{chunks}</code> })}</li>
      </ol>

      {onDone && (
        <button onClick={onDone} className="mt-3 text-xs text-neutral-400 hover:text-neutral-700">
          {t("savedEverything")}
        </button>
      )}
    </div>
  );
}
