"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

const MAIN_NAV = [
  { href: "/", key: "dashboard" },
  { href: "/lead-finder", key: "leadFinder" },
  { href: "/campaigns", key: "campaigns" },
  { href: "/ai-assistants", key: "aiAssistants" },
  { href: "/connections", key: "accounts" },
  { href: "/reports", key: "analytics" },
] as const;

const TOOLS_NAV = [
  { href: "/inbox", key: "inbox" },
  { href: "/sandbox", key: "sandbox" },
  { href: "/settings", key: "settings" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

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
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-2 mb-0.5 flex items-center rounded-md px-2.5 py-1.5 text-sm ${
                isActive(item.href) ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
        <div>
          <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {t("toolsSection")}
          </div>
          {TOOLS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-2 mb-0.5 flex items-center rounded-md px-2.5 py-1.5 text-sm ${
                isActive(item.href) ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
      </nav>
      <div className="space-y-2 border-t border-neutral-200 p-3">
        <LanguageSwitcher />
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}
