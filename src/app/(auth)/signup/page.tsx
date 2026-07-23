import { getTranslations } from "next-intl/server";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const t = await getTranslations("Auth");
  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">{t("signupTitle")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("signupSubtitle")}</p>
      <div className="mt-6">
        <SignupForm />
      </div>
    </div>
  );
}
