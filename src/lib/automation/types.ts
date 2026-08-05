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
  // Denormalized onto the action (same reasoning as the three fields
  // above) so message personalization — {{jobTitle}}/{{location}}/
  // {{industry}}/{{custom_field:Key}} — still works for follow-up steps
  // queued after acceptance, which only have this action snapshot to work
  // from, not the original Lead record.
  leadPosition: string;
  leadLocation: string;
  leadIndustry: string;
  leadCustomFields: Record<string, string>;
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
