import { getTranslations } from "next-intl/server";
import { Search, Megaphone, MessageCircle } from "lucide-react";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Auth");

  const features = [
    { icon: Search, text: t("brandFeature1") },
    { icon: Megaphone, text: t("brandFeature2") },
    { icon: MessageCircle, text: t("brandFeature3") },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-sm font-bold">
            R
          </span>
          <span className="text-lg font-semibold tracking-tight">ReachOS</span>
        </div>

        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">{t("brandHeadline")}</h2>
          <p className="mt-3 max-w-sm text-sm text-indigo-200">{t("brandSubline")}</p>

          <ul className="mt-8 space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-indigo-300">{t("brandFooter")}</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <span className="text-xl font-semibold tracking-tight text-neutral-900">ReachOS</span>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
