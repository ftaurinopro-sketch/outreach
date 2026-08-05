import { getTranslations } from "next-intl/server";
import CsvImportClient from "./CsvImportClient";

export default async function ImportLeadsPage() {
  const t = await getTranslations("ImportCsv");
  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("expectedColumns")}{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
          LinkedIn URL, First Name, Last Name, Headline, Location, Company, Position, Industry, Custom Field
        </code>
        . {t("onlyRequired")}{" "}
        <a href="/lead-import-template.csv" download className="text-neutral-900 underline">
          {t("downloadTemplate")}
        </a>
        .
      </p>
      <div className="mt-6">
        <CsvImportClient />
      </div>
    </div>
  );
}
