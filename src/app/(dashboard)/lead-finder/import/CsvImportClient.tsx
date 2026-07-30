"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseLeadsCsv, type ParseError } from "@/lib/leads/csv";
import type { Lead } from "@/lib/leads/types";

function formatError(t: ReturnType<typeof useTranslations>, error: ParseError): string {
  switch (error.type) {
    case "missingLinkedinUrlColumn":
      return t("errorMissingColumn");
    case "missingLinkedinUrlRow":
      return t("errorMissingUrlRow", { row: error.row });
    case "papaparse":
      return t("errorParse", { row: error.row ?? "?", message: error.message });
  }
}

export default function CsvImportClient() {
  const router = useRouter();
  const t = useTranslations("CsvImportClient");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [listName, setListName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function analyze(text: string) {
    setCsvText(text);
    const result = parseLeadsCsv(text);
    setLeads(result.leads);
    setParseErrors(result.errors);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (!listName) setListName(file.name.replace(/\.csv$/i, ""));
    analyze(text);
  }

  async function handleImport() {
    if (!leads?.length || !listName.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName.trim(), sourceType: "csv", leads }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("importError"));
      }
      const { list } = await res.json();
      router.push(`/lead-finder/${list.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unexpectedError"));
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:border-indigo-600"
          >
            {t("uploadFile")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-xs text-neutral-400">{t("orPasteBelow")}</span>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => analyze(e.target.value)}
          rows={6}
          placeholder="LinkedIn URL,First Name,Last Name,..."
          className="mt-3 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs focus:border-indigo-600 focus:outline-none"
        />
      </div>

      {leads !== null && (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">{t("leadsFound", { count: leads.length })}</h3>
          </div>

          {parseErrors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {parseErrors.map((err, i) => (
                <li key={i}>{formatError(t, err)}</li>
              ))}
            </ul>
          )}

          {leads.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400">
                    <th className="pb-1 pr-3">{t("colName")}</th>
                    <th className="pb-1 pr-3">{t("colCompany")}</th>
                    <th className="pb-1 pr-3">{t("colPosition")}</th>
                    <th className="pb-1">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 5).map((lead, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-3">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-1.5 pr-3">{lead.company}</td>
                      <td className="py-1.5 pr-3">{lead.position}</td>
                      <td className="max-w-[160px] truncate py-1.5 text-neutral-400">
                        {lead.linkedinUrl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length > 5 && (
                <p className="mt-1 text-xs text-neutral-400">{t("andMore", { count: leads.length - 5 })}</p>
              )}
            </div>
          )}

          {leads.length > 0 && (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <label className="mb-1 block text-xs font-medium text-neutral-500">{t("listName")}</label>
              <div className="flex gap-2">
                <input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder={t("listNamePlaceholder")}
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
                <button
                  onClick={handleImport}
                  disabled={importing || !listName.trim()}
                  className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importing ? t("importing") : t("importButton", { count: leads.length })}
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
