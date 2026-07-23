export type AgentConfig = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  companyName: string;
  language: string;
  objective: string;
  valueProp: string;
  products: string;
  differentiation: string;
  icp: string;
  tone: string;
  goal: string;
  calendarLink: string;
  objections: string;
  guardrails: string;
};

export type AgentInput = Omit<AgentConfig, "id" | "createdAt" | "updatedAt">;

export const EMPTY_AGENT_INPUT: AgentInput = {
  name: "",
  companyName: "",
  language: "English",
  objective: "Lead Generation",
  valueProp: "",
  products: "",
  differentiation: "",
  icp: "",
  tone: "Casual",
  goal: "Book a call",
  calendarLink: "",
  objections: "",
  guardrails: "",
};
