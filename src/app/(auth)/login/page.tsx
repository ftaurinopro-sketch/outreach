import { getTranslations } from "next-intl/server";
import LinkedInSignInButton from "@/components/LinkedInSignInButton";

export default async function LoginPage() {
  const t = await getTranslations("Auth");
  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("loginSubtitle")}</p>
      <div className="mt-6">
        <LinkedInSignInButton />
      </div>
    </div>
  );
}
