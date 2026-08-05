"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LinkedInLoginFlow from "./LinkedInLoginFlow";

export default function ConnectionSetupPanel({
  connection,
  defaultEmail,
  advancedDefaultOpen = false,
  onDone,
  onSaved,
}: {
  connection: { id: string; label: string; token?: string };
  defaultEmail?: string;
  advancedDefaultOpen?: boolean;
  onDone?: () => void;
  onSaved?: () => void;
}) {
  const t = useTranslations("ConnectionsClient");
  const [showAdvanced, setShowAdvanced] = useState(advancedDefaultOpen);
  const [showManualCookie, setShowManualCookie] = useState(false);
  const [cookieValue, setCookieValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [cookieSaved, setCookieSaved] = useState(false);

  async function saveCookie() {
    if (!cookieValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/connections/${connection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie: cookieValue.trim() }),
      });
      setCookieSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-indigo-600 bg-neutral-50 p-5">
      <h3 className="text-sm font-medium text-neutral-900">{t("setupTitle", { label: connection.label })}</h3>
      <p className="mt-0.5 text-xs text-neutral-500">{t("loginSectionDescription")}</p>

      <div className="mt-3">
        <LinkedInLoginFlow connectionId={connection.id} defaultEmail={defaultEmail} onSuccess={onSaved} />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{t("passwordDifferentNote")}</p>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-4 text-xs text-neutral-400 hover:text-neutral-700"
      >
        {showAdvanced ? t("hideAdvanced") : t("showAdvanced")}
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-4 border-t border-neutral-200 pt-3">
          {connection.token && (
            <div>
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
                  onClick={() => navigator.clipboard.writeText(connection.token!)}
                  className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-xs hover:border-indigo-600"
                >
                  {t("copy")}
                </button>
              </div>
            </div>
          )}

          <ol className="list-decimal space-y-1 pl-5 text-xs text-neutral-500">
            <li>
              {t("setupCliStep1")}{" "}
              <code className="font-mono">cd runner && npm install && npx playwright install chromium</code>
            </li>
            <li>{t.rich("setupCliStep2", { code: (chunks) => <code className="font-mono">{chunks}</code> })}</li>
            <li>{t.rich("setupCliStep3", { code: (chunks) => <code className="font-mono">{chunks}</code> })}</li>
          </ol>

          <div>
            {!showManualCookie ? (
              <button
                onClick={() => setShowManualCookie(true)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                {t("preferManualCookie")}
              </button>
            ) : (
              <div>
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
                    className="shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("save")}
                  </button>
                </div>
                {cookieSaved && <p className="mt-1 text-xs text-green-700">{t("cookieSaved")}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-neutral-500">{t("skipHint")}</p>

      {onDone && (
        <button onClick={onDone} className="mt-3 text-xs text-neutral-400 hover:text-neutral-700">
          {t("savedEverything")}
        </button>
      )}
    </div>
  );
}
