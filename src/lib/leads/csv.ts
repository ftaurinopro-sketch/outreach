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
  | "industry"
  | "customField";

const HEADER_MAP: Record<string, CsvField> = {
  "linkedin url": "linkedinUrl",
  "first name": "firstName",
  "last name": "lastName",
  headline: "headline",
  location: "location",
  company: "company",
  position: "position",
  industry: "industry",
  "custom field": "customField",
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
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const parseErrors: ParseError[] = errors.map((e) => ({
    type: "papaparse",
    row: e.row ?? null,
    message: e.message,
  }));

  const knownHeaders = new Set(Object.keys(HEADER_MAP));
  const missingLinkedinUrl = !(meta.fields ?? []).some(
    (f) => knownHeaders.has(f.trim().toLowerCase()) && HEADER_MAP[f.trim().toLowerCase()] === "linkedinUrl"
  );
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
    for (const [header, value] of Object.entries(row)) {
      const key = HEADER_MAP[header.trim().toLowerCase()];
      if (key) lead[key] = (value ?? "").trim();
    }
    if (!lead.linkedinUrl) {
      parseErrors.push({ type: "missingLinkedinUrlRow", row: i + 2 });
      return;
    }
    leads.push(lead);
  });

  return { leads, errors: parseErrors };
}
