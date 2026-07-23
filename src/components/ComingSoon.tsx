import { getTranslations } from "next-intl/server";

export default async function ComingSoon({ title, description }: { title: string; description: string }) {
  const t = await getTranslations("ComingSoon");

  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-2 text-neutral-500">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-sm text-neutral-400">
        {t("notBuiltYet")}
      </div>
    </div>
  );
}
