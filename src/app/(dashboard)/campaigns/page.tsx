import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { listCampaigns } from "@/lib/campaigns/store";

export default async function CampaignsPage() {
  const [campaigns, t, locale] = await Promise.all([
    listCampaigns(),
    getTranslations("Campaigns"),
    getLocale(),
  ]);

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {t("newCampaign")}
        </Link>
      </div>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.rich("draftNotice", {
          strong: (chunks) => <strong>{chunks}</strong>,
          link: (chunks) => (
            <Link href="/connections" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <Link href={`/campaigns/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                  {c.name}
                </Link>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    c.status === "active"
                      ? "bg-green-100 text-green-700"
                      : c.status === "paused"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <span className="text-xs text-neutral-400">
                {new Date(c.createdAt).toLocaleDateString(locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
