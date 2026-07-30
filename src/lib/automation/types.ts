export type ActionType = "send_connection_request" | "check_acceptance" | "send_message" | "check_reply";

export type ActionStatus = "pending" | "in_progress" | "done" | "failed" | "expired" | "cancelled";

export type AutomationAction = {
  id: string;
  createdAt: string;
  campaignId: string;
  connectionId: string;
  leadLinkedinUrl: string;
  leadFirstName: string;
  leadLastName: string;
  leadCompany: string;
  type: ActionType;
  payload: { text?: string; replied?: boolean };
  status: ActionStatus;
  scheduledAt: string;
  attempts: number;
  lastError: string | null;
  // for check_acceptance: how many times we've already rechecked this lead
  checkCount: number;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  // for check_acceptance
  accepted?: boolean;
  // for check_reply
  replied?: boolean;
};
