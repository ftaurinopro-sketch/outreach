"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "pending" | "in_progress" | "awaiting_verification" | "success" | "failed";

// Drives the automated email/password LinkedIn login for an existing
// connection: submits credentials, polls the attempt's status, and
// surfaces LinkedIn's verification-code challenge if one appears. Shared by
// ConnectionSetupPanel (right after creating a connection, as part of
// onboarding) and the per-connection row for existing ones. This is the
// "connect for automation" step — logging into ReachOS itself is a
// separate, real LinkedIn OAuth flow (see LinkedInSignInButton), since
// LinkedIn's public OAuth grants identity only, not automation permission.
export default function LinkedInLoginFlow({
  connectionId,
  defaultEmail,
  onSuccess,
}: {
  connectionId: string;
  defaultEmail?: string;
  onSuccess?: () => void;
}) {
  const t = useTranslations("ConnectionsClient");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/connections/${connectionId}/login/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      setPrompt(data.verificationPrompt ?? null);
      setError(data.error ?? null);
      if (data.status === "success" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.status === "success") onSuccess?.();
      }
    }, 3000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("loginError"));
      setAttemptId(data.attemptId);
      setStatus("pending");
      setPassword("");
      startPolling(data.attemptId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!attemptId || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/login/${attemptId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("unexpectedError"));
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "success") {
    return <p className="text-sm text-green-700">{t("loginSuccess")}</p>;
  }

  if (status === "awaiting_verification") {
    return (
      <form onSubmit={handleVerify} className="space-y-2">
        <p className="text-xs text-neutral-600">{prompt || t("verificationNeeded")}</p>
        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("verificationCodePlaceholder")}
            className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("confirmCode")}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    );
  }

  if (status === "pending" || status === "in_progress") {
    return <p className="text-sm text-neutral-500">{t("loginInProgress")}</p>;
  }

  return (
    <form onSubmit={handleLogin} className="space-y-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("linkedinEmailPlaceholder")}
        className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("linkedinPasswordPlaceholder")}
        className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? t("loggingIn") : t("loginWithLinkedin")}
      </button>
      {status === "failed" && error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
