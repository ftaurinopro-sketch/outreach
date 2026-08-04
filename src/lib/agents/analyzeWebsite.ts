import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TEXT_CHARS = 15000;
const FETCH_TIMEOUT_MS = 8000;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export type WebsiteProfile = {
  companyName: string;
  valueProp: string;
  products: string;
  differentiation: string;
  icp: string;
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_company_profile",
  description: "Extract a company profile from raw website text, for use in a B2B outreach tool.",
  input_schema: {
    type: "object",
    properties: {
      companyName: { type: "string", description: "The company's name, or empty string if not found." },
      valueProp: {
        type: "string",
        description: "What the company does, in one sentence, or empty string if unclear.",
      },
      products: {
        type: "string",
        description: "The products or services offered, as a short list/sentence, or empty string if unclear.",
      },
      differentiation: {
        type: "string",
        description: "Why a prospect should choose them over competitors, or empty string if not stated.",
      },
      icp: {
        type: "string",
        description:
          "The ideal customer profile this company appears to target (industry, role, company size), inferred from the copy, or empty string if not inferable.",
      },
    },
    required: ["companyName", "valueProp", "products", "differentiation", "icp"],
  },
};

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

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      "You extract a company profile from raw, messy website text (nav links, boilerplate, and cookie banners included) for a B2B outreach tool's onboarding. Never invent facts not implied by the text — use an empty string for anything you can't reasonably infer.",
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_company_profile" },
    messages: [{ role: "user", content: `Website text:\n\n${text}` }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { companyName: "", valueProp: "", products: "", differentiation: "", icp: "" };
  }
  const input = toolUse.input as Partial<WebsiteProfile>;
  return {
    companyName: input.companyName ?? "",
    valueProp: input.valueProp ?? "",
    products: input.products ?? "",
    differentiation: input.differentiation ?? "",
    icp: input.icp ?? "",
  };
}
