import Papa from "papaparse";
import type { Lead } from "./types";

const HEADER_MAP: Record<string, keyof Lead> = {
  "linkedin url": "linkedinUrl",
  "first name": "firstName",
  "last name": "lastName",
  headline: "headline",
  location: "location",
  company: "company",
  position: "position",
  industry: "industry",
};

export type ParseResult = {
  leads: Lead[];
  errors: string[];
};

export function parseLeadsCsv(csvText: string): ParseResult {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const parseErrors = errors.map((e) => `Riga ${e.row ?? "?"}: ${e.message}`);

  const knownHeaders = new Set(Object.keys(HEADER_MAP));
  const missingLinkedinUrl = !(meta.fields ?? []).some((f) => knownHeaders.has(f.trim().toLowerCase()) && HEADER_MAP[f.trim().toLowerCase()] === "linkedinUrl");
  if (missingLinkedinUrl) {
    parseErrors.unshift('Colonna "LinkedIn URL" mancante: è l\'unico campo obbligatorio.');
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
      parseErrors.push(`Riga ${i + 2}: manca il LinkedIn URL, riga saltata.`);
      return;
    }
    leads.push(lead);
  });

  return { leads, errors: parseErrors };
}
