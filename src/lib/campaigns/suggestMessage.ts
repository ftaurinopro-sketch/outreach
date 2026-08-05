import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "@/lib/agents/types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export type MessageStepKind = "connectionNote" | "firstMessage" | "followUp";

const SUGGEST_TOOL: Anthropic.Tool = {
  name: "suggest_message",
  description: "Draft one LinkedIn outreach message for a specific step of a campaign sequence.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The drafted message text, in the requested language." },
    },
    required: ["text"],
  },
};

function stepInstructions(kind: MessageStepKind, stepIndex: number): string {
  if (kind === "connectionNote") {
    return "This is the LinkedIn connection request note (max ~300 characters LinkedIn allows). Short, no pitch — just a genuine, specific reason to connect.";
  }
  if (kind === "firstMessage") {
    return "This is the first message, sent right after the lead accepts the connection request. They don't know this company yet — introduce the value proposition briefly and end with a low-friction question, not a hard pitch.";
  }
  return `This is follow-up message #${stepIndex} in the sequence. The lead has not replied to the previous message(s) yet — nudge the conversation forward with a new angle, don't just repeat the same ask.`;
}

// Drafts one message from the attached AI Assistant's "knowledge base"
// (company/value-prop/ICP/tone/etc., src/lib/agents/types.ts) — this is the
// only AI-generated text in the whole automation pipeline, and it is never
// sent automatically: the caller (CampaignForm) puts it in an editable
// textarea the user must review, edit, or discard before saving.
export async function suggestCampaignMessage(params: {
  agent: AgentConfig;
  language: string;
  kind: MessageStepKind;
  stepIndex: number;
  previousStepText?: string;
}): Promise<string> {
  const { agent, language, kind, stepIndex, previousStepText } = params;

  const systemPrompt = `You draft short, human-sounding LinkedIn outreach messages for a B2B seller, using only the knowledge base below. Never invent facts not implied by it. Write in ${language}. No corporate boilerplate, no em-dashes, no "I hope this finds you well" — write like a person, not a marketing template. Output only the message text itself, nothing else (no greeting placeholder like "Hi {{firstName}}" needed — the app substitutes lead variables like {{firstName}}/{{company}} after your draft, so you may use them if natural).

KNOWLEDGE BASE
Company: ${agent.companyName || "not specified"}
Value proposition: ${agent.valueProp || "not specified"}
Products/services: ${agent.products || "not specified"}
Differentiation: ${agent.differentiation || "not specified"}
Ideal customer profile: ${agent.icp || "not specified"}
Tone: ${agent.tone || "not specified"}
Goal of the conversation: ${agent.goal || "not specified"}
Common objections to anticipate: ${agent.objections || "none noted"}
Guardrails (things to never say/do): ${agent.guardrails || "none noted"}`;

  const userPrompt = `${stepInstructions(kind, stepIndex)}${
    previousStepText ? `\n\nPrevious step's message, for context (don't repeat it):\n${previousStepText}` : ""
  }`;

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: systemPrompt,
    tools: [SUGGEST_TOOL],
    tool_choice: { type: "tool", name: "suggest_message" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return "";
  const input = toolUse.input as { text?: string };
  return input.text ?? "";
}
