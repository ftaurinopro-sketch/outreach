"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Real OAuth: redirects to linkedin.com, the user authenticates there (2FA,
// passkeys, whatever they already use — we never see it), LinkedIn redirects
// back to /auth/callback with a code Supabase exchanges for a session. This
// only proves identity — it grants no permission to send connection
// requests or read messages, LinkedIn doesn't offer that via public OAuth.
// That's a separate step (ConnectionSetupPanel) after login.
export default function LinkedInSignInButton({ label }: { label?: string }) {
  const t = useTranslations("Auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // The @supabase/ssr browser client doesn't reliably self-navigate on
    // this call (unlike the plain supabase-js client) — drive the redirect
    // ourselves from the URL it returns instead of assuming it happens.
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setError(oauthError?.message ?? t("loginError"));
    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
        </svg>
        {loading ? t("connecting") : (label ?? t("continueWithLinkedIn"))}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
