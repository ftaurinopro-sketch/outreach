import { extractText, getDocumentProxy } from "unpdf";
import { extractCompanyProfileFromText, type WebsiteProfile } from "./extractCompanyProfile";

export type { WebsiteProfile };

const MAX_TEXT_CHARS = 15000;

export async function analyzeCompanyPdf(buffer: Buffer): Promise<WebsiteProfile> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
  return extractCompanyProfileFromText(cleaned);
}
