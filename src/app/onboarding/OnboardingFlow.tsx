"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Connection } from "@/lib/connections/types";
import { DEFAULT_CONNECTION_LIMITS } from "@/lib/connections/types";
import ConnectionSetupPanel from "@/components/ConnectionSetupPanel";
import AgentWizard from "@/app/(dashboard)/ai-assistants/new/AgentWizard";
import { detectSourceType } from "@/lib/scrape-jobs/types";

const STEPS = [1, 2, 3] as const;

export default function OnboardingFlow({ initialConnections }: { initialConnections: Connection[] }) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [connections, setConnections] = useState(initialConnections);
  const [newConnection, setNewConnection] = useState<{ id: string; label: string; token: string } | null>(
    null
  );
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                s <= step ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-px flex-1 ${s < step ? "bg-neutral-900" : "bg-neutral-200"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("step1Title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("step1Description")}</p>

          <div className="mt-6">
            {newConnection ? (
              <ConnectionSetupPanel connection={newConnection} onSaved={() => router.refresh()} />
            ) : connections.length > 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
                {t("connectionAlreadyExists", { label: connections[0].label })}
              </div>
            ) : (
              <CreateConnectionButton
                onCreated={(c) => {
                  setNewConnection(c);
                  setConnections((prev) => [{ ...c, ...DEFAULT_CONNECTION_LIMITS, userId: null, sessionCookie: null, createdAt: new Date().toISOString(), lastSeenAt: null }, ...prev]);
                }}
              />
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-neutral-400 hover:text-neutral-700">
              {t("skipForNow")}
            </button>
            <button
              onClick={() => setStep(2)}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("step2Title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("step2Description")}</p>
          <div className="mt-6">
            <AgentWizard onSaved={() => setStep(3)} />
          </div>
          <div className="mt-4">
            <button onClick={() => setStep(3)} className="text-sm text-neutral-400 hover:text-neutral-700">
              {t("skipForNow")}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("step3Title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("step3Description")}</p>

          <div className="mt-6">
            <OnboardingLeadListForm
              connections={connections.filter((c) => c.sessionCookie)}
              onDone={finish}
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={finish} disabled={finishing} className="text-sm text-neutral-400 hover:text-neutral-700">
              {finishing ? t("finishing") : t("skipAndFinish")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateConnectionButton({ onCreated }: { onCreated: (c: { id: string; label: string; token: string }) => void }) {
  const t = useTranslations("Onboarding");
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    setCreating(true);
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...DEFAULT_CONNECTION_LIMITS, label: t("defaultConnectionLabel") }),
    });
    const { connection } = await res.json();
    setCreating(false);
    onCreated({ id: connection.id, label: connection.label, token: connection.token });
  }

  return (
    <button
      onClick={handleClick}
      disabled={creating}
      className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
    >
      {creating ? t("connecting") : t("connectLinkedIn")}
    </button>
  );
}

function OnboardingLeadListForm({
  connections,
  onDone,
}: {
  connections: Connection[];
  onDone: () => void;
}) {
  const t = useTranslations("Onboarding");
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [searchUrl, setSearchUrl] = useState("");
  const [listName, setListName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
        {t("noReadyConnection")}
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <p className="text-sm text-green-700">{t("searchQueued")}</p>
        <button
          onClick={onDone}
          className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {t("continue")}
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, listName, searchUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("createError"));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("linkedinProfile")}</label>
        <select
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("searchUrlLabel")}</label>
        <input
          required
          value={searchUrl}
          onChange={(e) => setSearchUrl(e.target.value)}
          placeholder="https://www.linkedin.com/sales/search/people?..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {searchUrl && (
          <span className="mt-1.5 inline-block text-xs text-neutral-400">{detectSourceType(searchUrl)}</span>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">{t("listNameLabel")}</label>
        <input
          required
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? t("starting") : t("startSearch")}
      </button>
    </form>
  );
}
