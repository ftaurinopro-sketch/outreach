"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Status = "idle" | "pending" | "in_progress" | "awaiting_verification" | "success" | "failed";

// Drives the automated email/password LinkedIn login: submits credentials,
// polls the attempt's status, and surfaces LinkedIn's verification-code
// challenge if one appears. Two modes:
// - Normal (connectionId given): logs an existing connection in. Used by
//   ConnectionSetupPanel and the per-connection row for existing ones.
// - authMode: connectionId isn't known yet — submitting hits the unified
//   /api/auth/linkedin-login route instead, which creates/signs the user
//   into ReachOS *and* returns the connection to poll, then redirects home
//   on success.
export default function LinkedInLoginFlow({
  connectionId,
  defaultEmail,
  onSuccess,
  authMode,
}: {
  connectionId?: string;
  defaultEmail?: string;
  onSuccess?: () => void;
  authMode?: boolean;
}) {
  const t = useTranslations("ConnectionsClient");
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(connectionId ?? null);
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

  function startPolling(connId: string, id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/connections/${connId}/login/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      setPrompt(data.verificationPrompt ?? null);
      setError(data.error ?? null);
      if (data.status === "success" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.status === "success") {
          onSuccess?.();
          if (authMode) {
            router.push("/");
            router.refresh();
          }
        }
      }
    }, 3000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = authMode ? "/api/auth/linkedin-login" : `/api/connections/${connectionId}/login`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("loginError"));
      const connId = authMode ? data.connectionId : connectionId!;
      setActiveConnectionId(connId);
      setAttemptId(data.attemptId);
      setStatus("pending");
      setPassword("");
      startPolling(connId, data.attemptId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConnectionId || !attemptId || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${activeConnectionId}/login/${attemptId}/verify`, {
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
    return <p className="text-sm text-green-700">{authMode ? t("loginSuccessRedirecting") : t("loginSuccess")}</p>;
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
    <form onSubmit={handleLogin} className={authMode ? "space-y-3" : "space-y-2"}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("linkedinEmailPlaceholder")}
        className={
          authMode
            ? "w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            : "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
        }
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("linkedinPasswordPlaceholder")}
        className={
          authMode
            ? "w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            : "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
        }
      />
      <button
        type="submit"
        disabled={submitting}
        className={
          authMode
            ? "w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            : "rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        }
      >
        {submitting ? t("loggingIn") : t("loginWithLinkedin")}
      </button>
      {status === "failed" && error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
