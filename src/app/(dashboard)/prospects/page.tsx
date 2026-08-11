import { getTranslations } from "next-intl/server";
import { listProspects } from "@/lib/prospects/store";
import ProspectsClient from "./ProspectsClient";

export default async function ProspectsPage() {
  const [prospects, t] = await Promise.all([listProspects(), getTranslations("Prospects")]);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>

      <div className="mt-6">
        <ProspectsClient initialProspects={prospects} />
      </div>
    </div>
  );
}
