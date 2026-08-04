import { NextResponse } from "next/server";
import { hasClaudeConfig } from "@/lib/claude";
import { analyzeCompanyWebsite } from "@/lib/agents/analyzeWebsite";

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
];

function isSafeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(url.hostname))) return null;
  return url;
}

export async function POST(request: Request) {
  if (!hasClaudeConfig()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurata: necessaria per l'analisi del sito." },
      { status: 501 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const url = isSafeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json({ error: "URL non valido" }, { status: 400 });
  }

  try {
    const profile = await analyzeCompanyWebsite(url.toString());
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Website analysis error", error);
    return NextResponse.json({ error: "Errore durante l'analisi del sito" }, { status: 502 });
  }
}
