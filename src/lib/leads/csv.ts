import Papa from "papaparse";
import type { Lead } from "./types";

type CsvField =
  | "linkedinUrl"
  | "firstName"
  | "lastName"
  | "headline"
  | "location"
  | "company"
  | "position"
  | "industry";

const HEADER_MAP: Record<string, CsvField> = {
  "linkedin url": "linkedinUrl",
  "first name": "firstName",
  "last name": "lastName",
  headline: "headline",
  location: "location",
  company: "company",
  position: "position",
  industry: "industry",
};

export type ParseError =
  | { type: "papaparse"; row: number | null; message: string }
  | { type: "missingLinkedinUrlColumn" }
  | { type: "missingLinkedinUrlRow"; row: number };

export type ParseResult = {
  leads: Lead[];
  errors: ParseError[];
};

export function parseLeadsCsv(csvText: string): ParseResult {
  // Only trimmed, not lowercased — original casing is preserved for
  // whatever ends up as a custom-field key below, so "Deal Size" in the CSV
  // becomes {{custom_field:Deal Size}} in a message, not "deal size".
  // Recognized fields are still matched case-insensitively via .toLowerCase()
  // lookups against HEADER_MAP.
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const parseErrors: ParseError[] = errors.map((e) => ({
    type: "papaparse",
    row: e.row ?? null,
    message: e.message,
  }));

  const missingLinkedinUrl = !(meta.fields ?? []).some((f) => HEADER_MAP[f.toLowerCase()] === "linkedinUrl");
  if (missingLinkedinUrl) {
    parseErrors.unshift({ type: "missingLinkedinUrlColumn" });
  }

  const leads: Lead[] = [];
  data.forEach((row, i) => {
    const lead: Lead = {
      linkedinUrl: "",
      firstName: "",
      lastName: "",
      headline: "",
      location: "",
      company: "",
      position: "",
      industry: "",
    };
    let customFields: Record<string, string> | undefined;
    for (const [header, value] of Object.entries(row)) {
      const trimmedValue = (value ?? "").trim();
      const key = HEADER_MAP[header.toLowerCase()];
      if (key) {
        lead[key] = trimmedValue;
      } else if (trimmedValue) {
        // Any column that isn't one of the recognized fields becomes a
        // custom field instead of being silently dropped.
        customFields ??= {};
        customFields[header] = trimmedValue;
      }
    }
    if (customFields) lead.customFields = customFields;
    if (!lead.linkedinUrl) {
      parseErrors.push({ type: "missingLinkedinUrlRow", row: i + 2 });
      return;
    }
    leads.push(lead);
  });

  return { leads, errors: parseErrors };
}
