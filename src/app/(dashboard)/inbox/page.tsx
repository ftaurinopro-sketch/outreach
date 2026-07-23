import { getTranslations } from "next-intl/server";
import ComingSoon from "@/components/ComingSoon";

export default async function InboxPage() {
  const t = await getTranslations("Inbox");
  return <ComingSoon title={t("title")} description={t("description")} />;
}
