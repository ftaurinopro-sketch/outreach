"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_ITEMS = [
  { href: "/", key: "getStarted" },
  { href: "/campaigns", key: "campaigns" },
  { href: "/inbox", key: "inbox" },
  { href: "/lead-finder", key: "leadFinder" },
  { href: "/connections", key: "connections" },
  { href: "/ai-assistants", key: "aiAssistants" },
  { href: "/sandbox", key: "sandbox" },
  { href: "/reports", key: "reports" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-neutral-200">
        <span className="font-semibold text-neutral-900">{t("brand")}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="mb-4">
          <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {t("section")}
          </div>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-2 mb-0.5 flex items-center rounded-md px-2.5 py-1.5 text-sm ${
                  active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-neutral-200 p-3">
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
