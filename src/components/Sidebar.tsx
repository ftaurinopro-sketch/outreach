"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Search,
  Megaphone,
  Bot,
  Users,
  BarChart3,
  Inbox as InboxIcon,
  FlaskConical,
  Settings as SettingsIcon,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

const MAIN_NAV: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/lead-finder", key: "leadFinder", icon: Search },
  { href: "/campaigns", key: "campaigns", icon: Megaphone },
  { href: "/ai-assistants", key: "aiAssistants", icon: Bot },
  { href: "/connections", key: "accounts", icon: Users },
  { href: "/reports", key: "analytics", icon: BarChart3 },
];

const TOOLS_NAV: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/inbox", key: "inbox", icon: InboxIcon },
  { href: "/sandbox", key: "sandbox", icon: FlaskConical },
  { href: "/settings", key: "settings", icon: SettingsIcon },
];

export default function Sidebar({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-neutral-200">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
          R
        </span>
        <span className="font-semibold text-neutral-900">{t("brand")}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {!isSuperadmin && (
          <>
            <div className="mb-4">
              <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                {t("section")}
              </div>
              {MAIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${
                    isActive(item.href) ? "bg-indigo-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
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
                  className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${
                    isActive(item.href) ? "bg-indigo-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {t(item.key)}
                </Link>
              ))}
            </div>
          </>
        )}
        {isSuperadmin && (
          <div>
            <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              {t("adminSection")}
            </div>
            <Link
              href="/admin/users"
              className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${
                isActive("/admin/users") ? "bg-indigo-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t("admin")}
            </Link>
          </div>
        )}
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
