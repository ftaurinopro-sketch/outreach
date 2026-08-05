import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/locales";

// /api/extension and /api/runner authenticate themselves via their own
// bearer tokens (per-connection token, or RUNNER_MASTER_KEY) — they have no
// Supabase session at all, so gating them here on `user` was silently
// redirecting every single call from the extension/runner to /login (a
// 307 with an HTML body) instead of ever reaching the route handler.
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/api/extension", "/api/runner"];

// Spain + the LatAm countries big enough to matter here. Everything else
// (including AT/CH, deliberately — only DE was asked for) falls through to
// English.
const SPANISH_COUNTRIES = new Set([
  "ES",
  "MX",
  "AR",
  "CO",
  "CL",
  "PE",
  "VE",
  "EC",
  "GT",
  "CU",
  "BO",
  "DO",
  "HN",
  "PY",
  "SV",
  "NI",
  "CR",
  "PA",
  "UY",
]);

function localeForCountry(country: string | null): Locale {
  if (country === "IT") return "it";
  if (country === "DE") return "de";
  if (country && SPANISH_COUNTRIES.has(country)) return "es";
  return DEFAULT_LOCALE;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  // First visit only — once the cookie exists (set here, or explicitly via
  // the LanguageSwitcher's /api/locale call), it always wins over geography.
  // Vercel sets x-vercel-ip-country at the edge for every request, no
  // external GeoIP lookup needed.
  const hadLocaleCookie = Boolean(request.cookies.get(LOCALE_COOKIE));
  if (!hadLocaleCookie) {
    const locale = localeForCountry(request.headers.get("x-vercel-ip-country"));
    // Set on the request too (not just the response) so this same request's
    // server-render already sees it — otherwise the first page view would
    // still render in the default locale, one request too early.
    request.cookies.set(LOCALE_COOKIE, locale);
  }
  const locale = request.cookies.get(LOCALE_COOKIE)!.value as Locale;

  function withLocaleCookie(response: NextResponse): NextResponse {
    if (!hadLocaleCookie) {
      response.cookies.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
    }
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase auth configured yet: stay in zero-config local-dev mode,
  // don't gate anything (see src/lib/supabase/user.ts hasSupabaseAuthConfig).
  if (!url || !anonKey) {
    return withLocaleCookie(NextResponse.next({ request }));
  }

  let response = withLocaleCookie(NextResponse.next({ request }));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = withLocaleCookie(NextResponse.next({ request }));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!user && !publicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return withLocaleCookie(NextResponse.redirect(redirectUrl));
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return withLocaleCookie(NextResponse.redirect(redirectUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
