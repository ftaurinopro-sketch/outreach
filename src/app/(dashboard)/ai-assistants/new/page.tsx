import { getTranslations } from "next-intl/server";
import AgentWizard from "./AgentWizard";

export default async function NewAgentPage() {
  const t = await getTranslations("NewAgent");
  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
      <div className="mt-6">
        <AgentWizard />
      </div>
    </div>
  );
}
