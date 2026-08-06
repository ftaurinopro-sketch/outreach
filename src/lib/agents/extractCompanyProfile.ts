import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

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
  description: "Extract a company profile from raw text, for use in a B2B outreach tool.",
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

export async function extractCompanyProfileFromText(text: string): Promise<WebsiteProfile> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      "You extract a company profile from raw, messy text for a B2B outreach tool's onboarding — it may come from a website (nav links, boilerplate, and cookie banners included) or from an uploaded document (a brochure, deck, or one-pager). Never invent facts not implied by the text — use an empty string for anything you can't reasonably infer.",
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_company_profile" },
    messages: [{ role: "user", content: `Document text:\n\n${text}` }],
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
