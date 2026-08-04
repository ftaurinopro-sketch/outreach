"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import LinkedInSignInButton from "./LinkedInSignInButton";

// Login and signup are the same underlying LinkedIn OAuth call — Supabase
// creates the account on first sign-in automatically, there's no separate
// registration step. The tabs below are purely presentational, so returning
// users get an "Accedi" framing and new ones get "Registrati", without us
// needing to actually branch the auth logic.
export default function AuthCard() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login"
  );

  return (
    <div>
      <div className="mb-6 flex rounded-lg bg-neutral-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "login" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {t("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "register" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {t("tabRegister")}
        </button>
      </div>

      <h1 className="text-lg font-semibold text-neutral-900">
        {mode === "login" ? t("loginTitle") : t("registerTitle")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
      </p>

      <div className="mt-6">
        <LinkedInSignInButton label={mode === "login" ? t("continueLogin") : t("continueRegister")} />
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">{t("moreProvidersSoon")}</p>
    </div>
  );
}
