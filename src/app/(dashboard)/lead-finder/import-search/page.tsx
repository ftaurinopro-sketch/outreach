import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listConnections } from "@/lib/connections/store";
import SearchImportClient from "./SearchImportClient";

export default async function ImportSearchPage() {
  const [connections, t] = await Promise.all([listConnections(), getTranslations("ImportSearch")]);
  const ready = connections.filter((c) => c.sessionCookie);

  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>

      {ready.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
          {t.rich("needConnection", {
            link: (chunks) => (
              <Link href="/connections" className="text-neutral-900 underline">
                {chunks}
              </Link>
            ),
          })}
        </div>
      ) : (
        <div className="mt-6">
          <SearchImportClient connections={ready} />
        </div>
      )}
    </div>
  );
}
