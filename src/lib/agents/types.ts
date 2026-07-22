export type AgentConfig = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  companyName: string;
  valueProp: string;
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
  valueProp: "",
  differentiation: "",
  icp: "",
  tone: "Casual",
  goal: "Prenotare una call",
  calendarLink: "",
  objections: "",
  guardrails: "",
};
