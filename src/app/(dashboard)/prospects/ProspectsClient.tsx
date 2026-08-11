"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseLeadsCsv } from "@/lib/leads/csv";
import type { Prospect, ProspectInput } from "@/lib/prospects/types";
import FitBadge from "@/components/FitBadge";

export default function ProspectsClient({ initialProspects }: { initialProspects: Prospect[] }) {
  const t = useTranslations("Prospects");
  const [prospects, setProspects] = useState(initialProspects);
  const [keyword, setKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return prospects.filter((p) => {
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      if (!kw) return true;
      const haystack = `${p.firstName} ${p.lastName} ${p.company} ${p.headline} ${p.location}`.toLowerCase();
      return haystack.includes(kw);
    });
  }, [prospects, keyword, sourceFilter]);

  async function importCsv(file: File) {
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const { leads, errors } = parseLeadsCsv(text);
      if (leads.length === 0) {
        setImportError(errors[0]?.type === "missingLinkedinUrlColumn" ? t("csvMissingColumn") : t("csvEmpty"));
        return;
      }
      const inputs: ProspectInput[] = leads.map((l) => ({
        linkedinUrl: l.linkedinUrl,
        firstName: l.firstName,
        lastName: l.lastName,
        headline: l.headline,
        company: l.company,
        position: l.position,
        location: l.location,
        industry: l.industry,
        customFields: l.customFields,
        source: "csv",
      }));
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: inputs }),
      });
      if (!res.ok) throw new Error();
      const { prospects: created } = await res.json();
      setProspects((prev) => {
        const byUrl = new Map(prev.map((p) => [p.linkedinUrl, p] as const));
        for (const p of created as Prospect[]) byUrl.set(p.linkedinUrl, p);
        return Array.from(byUrl.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    } catch {
      setImportError(t("csvImportError"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="all">{t("allSources")}</option>
            <option value="csv">{t("sourceCsv")}</option>
            <option value="manual">{t("sourceManual")}</option>
            <option value="linkedin_basic_search">{t("sourceSearch")}</option>
            <option value="sales_navigator_search">{t("sourceSalesNav")}</option>
          </select>
          <span className="text-xs text-neutral-400">{t("countLabel", { count: filtered.length })}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {importing ? t("importing") : t("importCsv")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importCsv(file);
            }}
          />
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("addProspect")}
          </button>
        </div>
      </div>

      {importError && <p className="text-sm text-red-600">{importError}</p>}

      {showAddForm && (
        <AddProspectForm
          onAdded={(p) => {
            // p may be an existing prospect the backend just merged new
            // fields onto (same linkedinUrl already in the directory) —
            // replace that row instead of appending a duplicate.
            setProspects((prev) => [p, ...prev.filter((existing) => existing.id !== p.id)]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          {prospects.length === 0 ? t("empty") : t("noResults")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                <th className="px-4 py-2 font-medium">{t("colName")}</th>
                <th className="px-4 py-2 font-medium">{t("colCompany")}</th>
                <th className="px-4 py-2 font-medium">{t("colPosition")}</th>
                <th className="px-4 py-2 font-medium">{t("colLocation")}</th>
                <th className="px-4 py-2 font-medium">{t("colSource")}</th>
                <th className="px-4 py-2 font-medium">{t("colFit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <a
                      href={p.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-neutral-900 hover:text-indigo-600"
                    >
                      {p.firstName} {p.lastName}
                    </a>
                    {p.headline && <div className="text-xs text-neutral-400">{p.headline}</div>}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{p.company || "—"}</td>
                  <td className="px-4 py-2 text-neutral-600">{p.position || "—"}</td>
                  <td className="px-4 py-2 text-neutral-600">{p.location || "—"}</td>
                  <td className="px-4 py-2 text-xs text-neutral-400">{p.source}</td>
                  <td className="px-4 py-2">
                    {p.fitCategory ? <FitBadge category={p.fitCategory} score={p.score ?? undefined} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddProspectForm({
  onAdded,
  onCancel,
}: {
  onAdded: (p: Prospect) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Prospects");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkedinUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: [{ linkedinUrl, firstName, lastName, company, position, source: "manual" }],
        }),
      });
      if (!res.ok) throw new Error();
      const { prospects } = await res.json();
      onAdded(prospects[0]);
    } catch {
      setError(t("addError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-5"
    >
      <input
        required
        value={linkedinUrl}
        onChange={(e) => setLinkedinUrl(e.target.value)}
        placeholder={t("linkedinUrlPlaceholder")}
        className="col-span-2 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm sm:col-span-1"
      />
      <input
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder={t("firstNamePlaceholder")}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder={t("lastNamePlaceholder")}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder={t("companyPlaceholder")}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      <input
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        placeholder={t("positionPlaceholder")}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      <div className="col-span-full flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
