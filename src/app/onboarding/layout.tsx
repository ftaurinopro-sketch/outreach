import { getTranslations } from "next-intl/server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Onboarding");
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-4 flex justify-end">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
        {children}
      </div>
    </div>
  );
}
