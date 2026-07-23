import { getTranslations } from "next-intl/server";
import ComingSoon from "@/components/ComingSoon";

export default async function ReportsPage() {
  const t = await getTranslations("Reports");
  return <ComingSoon title={t("title")} description={t("description")} />;
}
