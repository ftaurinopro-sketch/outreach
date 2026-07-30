"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import FitBadge from "@/components/FitBadge";
import { FIT_CATEGORIES, type FitCategory, type Lead } from "@/lib/leads/types";

type FitFilterValue = FitCategory | "unscored";

function distinct(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

function PillGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              selected.has(opt)
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeadFilterTable({
  leads,
  contactedUrls,
}: {
  leads: Lead[];
  contactedUrls: string[];
}) {
  const t = useTranslations("LeadFilters");
  const tDetail = useTranslations("LeadListDetail");
  const tFit = useTranslations("FitBadge");

  const [keyword, setKeyword] = useState("");
  const [selectedFits, setSelectedFits] = useState<Set<FitFilterValue>>(new Set());
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [selectedSeniorities, setSelectedSeniorities] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [excludeCompanies, setExcludeCompanies] = useState("");
  const [hideContacted, setHideContacted] = useState(false);

  const contactedSet = useMemo(() => new Set(contactedUrls), [contactedUrls]);
  const industries = useMemo(() => distinct(leads.map((l) => l.industry)), [leads]);
  const locations = useMemo(() => distinct(leads.map((l) => l.location)), [leads]);
  const seniorities = useMemo(() => distinct(leads.map((l) => l.seniority)), [leads]);
  const hasAnyScore = useMemo(() => leads.some((l) => l.fitCategory), [leads]);

  const excludedList = useMemo(
    () =>
      excludeCompanies
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    [excludeCompanies]
  );

  function toggle<T>(set: Set<T>, setState: (s: Set<T>) => void, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setState(next);
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const min = minScore === "" ? null : Number(minScore);
    const max = maxScore === "" ? null : Number(maxScore);

    return leads
      .filter((lead) => {
        if (kw) {
          const haystack = `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.headline} ${lead.position}`.toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
        if (selectedFits.size > 0) {
          const cat: FitFilterValue = lead.fitCategory ?? "unscored";
          if (!selectedFits.has(cat)) return false;
        }
        if (min !== null && (lead.score ?? -1) < min) return false;
        if (max !== null && (lead.score ?? 101) > max) return false;
        if (selectedIndustries.size > 0 && !selectedIndustries.has(lead.industry)) return false;
        if (selectedLocations.size > 0 && !selectedLocations.has(lead.location)) return false;
        if (selectedSeniorities.size > 0 && !selectedSeniorities.has(lead.seniority ?? "")) return false;
        if (excludedList.length > 0) {
          const company = lead.company.toLowerCase();
          if (excludedList.some((c) => company.includes(c))) return false;
        }
        if (hideContacted && contactedSet.has(lead.linkedinUrl)) return false;
        return true;
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [
    leads,
    keyword,
    selectedFits,
    minScore,
    maxScore,
    selectedIndustries,
    selectedLocations,
    selectedSeniorities,
    excludedList,
    hideContacted,
    contactedSet,
  ]);

  const filtersActive =
    keyword !== "" ||
    selectedFits.size > 0 ||
    selectedIndustries.size > 0 ||
    selectedLocations.size > 0 ||
    selectedSeniorities.size > 0 ||
    minScore !== "" ||
    maxScore !== "" ||
    excludeCompanies !== "" ||
    hideContacted;

  function resetFilters() {
    setKeyword("");
    setSelectedFits(new Set());
    setSelectedIndustries(new Set());
    setSelectedLocations(new Set());
    setSelectedSeniorities(new Set());
    setMinScore("");
    setMaxScore("");
    setExcludeCompanies("");
    setHideContacted(false);
  }

  const fitOptions: FitFilterValue[] = hasAnyScore ? [...FIT_CATEGORIES, "unscored"] : [];

  return (
    <div>
      <div className="mt-6 space-y-4 rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("keywordPlaceholder")}
            className="min-w-[220px] flex-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
          />
          {hasAnyScore && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400">{t("scoreMin")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
              />
              <span className="text-xs text-neutral-400">{t("scoreMax")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={hideContacted}
              onChange={(e) => setHideContacted(e.target.checked)}
            />
            {t("hideContacted")}
          </label>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
            >
              <X className="h-3.5 w-3.5" />
              {t("reset")}
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hasAnyScore && (
            <div>
              <div className="text-xs font-medium text-neutral-400">{t("fit")}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {fitOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(selectedFits, setSelectedFits, opt)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      selectedFits.has(opt)
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {opt === "unscored" ? t("unscored") : tFit(opt)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <PillGroup
            label={t("industry")}
            options={industries}
            selected={selectedIndustries}
            onToggle={(v) => toggle(selectedIndustries, setSelectedIndustries, v)}
          />
          <PillGroup
            label={t("location")}
            options={locations}
            selected={selectedLocations}
            onToggle={(v) => toggle(selectedLocations, setSelectedLocations, v)}
          />
          {hasAnyScore && (
            <PillGroup
              label={t("seniority")}
              options={seniorities}
              selected={selectedSeniorities}
              onToggle={(v) => toggle(selectedSeniorities, setSelectedSeniorities, v)}
            />
          )}
          <div>
            <div className="text-xs font-medium text-neutral-400">{t("excludeCompanies")}</div>
            <input
              type="text"
              value={excludeCompanies}
              onChange={(e) => setExcludeCompanies(e.target.value)}
              placeholder={t("excludeCompaniesPlaceholder")}
              className="mt-1.5 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        {t("showingCount", { filtered: filtered.length, total: leads.length })}
      </p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-400">
            <tr>
              <th className="px-4 py-2.5">{tDetail("colFit")}</th>
              <th className="px-4 py-2.5">{tDetail("colName")}</th>
              <th className="px-4 py-2.5">{tDetail("colHeadline")}</th>
              <th className="px-4 py-2.5">{tDetail("colCompany")}</th>
              <th className="px-4 py-2.5">{tDetail("colPosition")}</th>
              <th className="px-4 py-2.5">{tDetail("colLocation")}</th>
              <th className="px-4 py-2.5">LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5">
                  {lead.fitCategory ? (
                    <div title={lead.scoreReasoning}>
                      <FitBadge category={lead.fitCategory} score={lead.score} />
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-neutral-500">{lead.headline}</td>
                <td className="px-4 py-2.5">{lead.company}</td>
                <td className="px-4 py-2.5">{lead.position}</td>
                <td className="px-4 py-2.5">{lead.location}</td>
                <td className="px-4 py-2.5">
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-500 hover:text-neutral-900 hover:underline"
                  >
                    {tDetail("profileLink")} →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">{t("noResults")}</p>
        )}
      </div>
    </div>
  );
}
