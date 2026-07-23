"use client";

import { useTranslations } from "next-intl";
import { FIT_CATEGORY_COLOR, type FitCategory } from "@/lib/leads/types";

const EMOJI: Record<FitCategory, string> = {
  perfect_fit: "🟢",
  strong_fit: "🟢",
  possible_fit: "🟡",
  weak_fit: "🟠",
  no_fit: "🔴",
};

export default function FitBadge({ category, score }: { category: FitCategory; score?: number }) {
  const t = useTranslations("FitBadge");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${FIT_CATEGORY_COLOR[category]}`}
    >
      <span aria-hidden>{EMOJI[category]}</span>
      {t(category)}
      {typeof score === "number" && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
