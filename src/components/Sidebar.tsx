"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Prospecting",
    items: [
      { href: "/", label: "Get Started" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/inbox", label: "Inbox" },
      { href: "/lead-finder", label: "Lead Finder" },
      { href: "/connections", label: "Connections" },
      { href: "/ai-assistants", label: "AI Assistants" },
      { href: "/sandbox", label: "Sandbox" },
      { href: "/reports", label: "Reports" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-neutral-200">
        <span className="font-semibold text-neutral-900">ReachOS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mx-2 mb-0.5 flex items-center rounded-md px-2.5 py-1.5 text-sm ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
