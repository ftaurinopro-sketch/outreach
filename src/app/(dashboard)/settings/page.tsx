import { getTranslations } from "next-intl/server";
import ComingSoon from "@/components/ComingSoon";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  return <ComingSoon title={t("title")} description={t("description")} />;
}
