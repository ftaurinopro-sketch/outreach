export type ActivityEventStatus = "pending" | "in_progress" | "done" | "failed" | "expired" | "cancelled";

// Step-agnostic execution log/queue — the generalization of
// src/lib/automation/types.ts's AutomationAction that isn't locked to the 4
// hardcoded action types. Old campaigns keep using automation_actions
// unmodified; campaigns built on the new sequence engine use this instead.
export type ActivityEvent = {
  id: string;
  createdAt: string;
  campaignId: string;
  prospectId: string;
  campaignProspectId: string;
  stepId: string | null;
  accountId: string | null;
  actionType: string;
  status: ActivityEventStatus;
  scheduledAt: string;
  executedAt: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  attempts: number;
};

export type NewActivityEvent = Omit<ActivityEvent, "id" | "createdAt" | "status" | "executedAt" | "error" | "attempts">;
