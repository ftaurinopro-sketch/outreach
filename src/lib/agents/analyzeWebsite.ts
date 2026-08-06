import { extractCompanyProfileFromText, type WebsiteProfile } from "./extractCompanyProfile";

export type { WebsiteProfile };

const MAX_TEXT_CHARS = 15000;
const FETCH_TIMEOUT_MS = 8000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ReachOSBot/1.0)" },
    });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const html = await res.text();
    return stripHtml(html).slice(0, MAX_TEXT_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeCompanyWebsite(url: string): Promise<WebsiteProfile> {
  const text = await fetchWebsiteText(url);
  return extractCompanyProfileFromText(text);
}
