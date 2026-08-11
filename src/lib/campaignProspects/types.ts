// The prospect-in-campaign state machine — previously never persisted
// anywhere, only ever inferred (three separate, partially inconsistent
// ways) from raw automation_actions rows. This IS the source of truth now;
// every UI surface (campaign monitoring, dashboard, prospect list) reads
// this field instead of recomputing it.
export const CAMPAIGN_PROSPECT_STATUSES = [
  "new",
  "queued",
  "in_progress",
  "waiting",
  "connection_sent",
  "connected",
  "messaged",
  "replied",
  "completed",
  "paused",
  "failed",
  "opted_out",
] as const;
export type CampaignProspectStatus = (typeof CAMPAIGN_PROSPECT_STATUSES)[number];

// Statuses that mean "the sequence has stopped advancing for this prospect,
// for good" — used to decide whether a prospect is still eligible for the
// engine to schedule further actions, and whether they should be excluded
// from a *different* campaign's overlap check (a prospect who finished or
// opted out of campaign A is fine to add to campaign B; one who's still
// mid-sequence in A should trigger a warning).
export const TERMINAL_STATUSES: CampaignProspectStatus[] = ["completed", "failed", "opted_out"];

export type CampaignProspect = {
  id: string;
  campaignId: string;
  prospectId: string;
  status: CampaignProspectStatus;
  currentStepPosition: number;
  nextAction: string | null;
  nextExecutionAt: string | null;
  lastActionAt: string | null;
  stoppedReason: string | null;
  addedAt: string;
};

export type CampaignProspectOverlap = {
  prospectId: string;
  campaignId: string;
  campaignName: string;
  status: CampaignProspectStatus;
};
