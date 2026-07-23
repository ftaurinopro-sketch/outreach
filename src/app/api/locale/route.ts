import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/locales";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  if (!body.locale || !isLocale(body.locale)) {
    return NextResponse.json({ error: "Locale non valido" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCALE_COOKIE, body.locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
