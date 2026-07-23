import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "@/lib/agents/types";
import type { FitCategory, Lead } from "./types";
import { FIT_CATEGORIES } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const BATCH_SIZE = 10;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

type ScoreResult = {
  index: number;
  fitCategory: FitCategory;
  score: number;
  seniority: string;
  reasoning: string;
  signals: string;
};

const SCORE_TOOL: Anthropic.Tool = {
  name: "score_leads",
  description: "Return an ICP fit score for each lead in the batch, in the same order.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "0-based index of the lead in this batch" },
            fitCategory: { type: "string", enum: FIT_CATEGORIES },
            score: { type: "number", description: "0-100, higher = better fit" },
            seniority: {
              type: "string",
              description: "Inferred seniority level (e.g. C-level, VP, Director, Manager, IC), or empty string if not inferable",
            },
            signals: {
              type: "string",
              description: "Any interest/buying signals inferable from the headline (e.g. 'actively hiring', 'recently promoted'), or empty string if none",
            },
            reasoning: { type: "string", description: "One short sentence explaining the score" },
          },
          required: ["index", "fitCategory", "score", "seniority", "signals", "reasoning"],
        },
      },
    },
    required: ["results"],
  },
};

function buildSystemPrompt(agent: AgentConfig): string {
  return `You score LinkedIn leads for fit against a company's Ideal Customer Profile (ICP), using only the limited public data available in a search results page (no full profile access).

COMPANY: ${agent.companyName}
VALUE PROPOSITION: ${agent.valueProp || "not specified"}
IDEAL CUSTOMER PROFILE (ICP): ${agent.icp || "not specified"}
DIFFERENTIATION: ${agent.differentiation || "not specified"}

For each lead, infer role, seniority, industry fit, and company fit from their headline/company/position/location, and assign:
- fitCategory: perfect_fit, strong_fit, possible_fit, weak_fit, or no_fit
- score: 0-100 (perfect_fit ~85-100, strong_fit ~65-84, possible_fit ~40-64, weak_fit ~20-39, no_fit ~0-19)
- seniority: your best inference (C-level / VP / Director / Manager / IC), or "" if you can't tell
- signals: any buying/interest signal visible in the text (e.g. "hiring for growth roles", "posted about scaling"), or "" if none
- reasoning: one short sentence

Be decisive — with limited data, a reasonable inference is more useful than "unknown". Never invent facts not implied by the given text.`;
}

function buildBatchPrompt(leads: Lead[]): string {
  return leads
    .map(
      (l, i) =>
        `[${i}] Name: ${l.firstName} ${l.lastName} | Headline: ${l.headline || "—"} | Company: ${l.company || "—"} | Position: ${l.position || "—"} | Location: ${l.location || "—"} | Industry: ${l.industry || "—"}`
    )
    .join("\n");
}

async function scoreBatch(agent: AgentConfig, leads: Lead[]): Promise<ScoreResult[]> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(agent),
    tools: [SCORE_TOOL],
    tool_choice: { type: "tool", name: "score_leads" },
    messages: [{ role: "user", content: buildBatchPrompt(leads) }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];
  const input = toolUse.input as { results: ScoreResult[] };
  return input.results ?? [];
}

export async function scoreLeads(agent: AgentConfig, leads: Lead[]): Promise<Lead[]> {
  const scored = [...leads];
  const scoredAt = new Date().toISOString();

  for (let start = 0; start < leads.length; start += BATCH_SIZE) {
    const batch = leads.slice(start, start + BATCH_SIZE);
    const results = await scoreBatch(agent, batch);

    for (const result of results) {
      const globalIndex = start + result.index;
      if (globalIndex < 0 || globalIndex >= scored.length) continue;
      scored[globalIndex] = {
        ...scored[globalIndex],
        score: result.score,
        fitCategory: result.fitCategory,
        seniority: result.seniority,
        signals: result.signals,
        scoreReasoning: result.reasoning,
        scoredAt,
        scoredByAgentId: agent.id,
      };
    }
  }

  return scored;
}
