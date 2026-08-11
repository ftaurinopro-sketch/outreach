// Synthetic action types the engine schedules itself, on top of the real
// SequenceActionType steps a user defines — they never appear in
// sequence_steps, only ever as activity_events.action_type.
export const SYNTHETIC_ACTION_TYPES = ["check_connection_status", "check_reply"] as const;
export type SyntheticActionType = (typeof SYNTHETIC_ACTION_TYPES)[number];

// How many times the engine will re-check "did they accept yet?" before
// giving up on a connection request — same reasoning/cadence as the old
// scheduler's MAX_ACCEPTANCE_CHECKS (roughly one check/day for ~20 days).
export const MAX_CONNECTION_STATUS_CHECKS = 20;
export const CONNECTION_STATUS_CHECK_INTERVAL_HOURS = 24;

export type StepResult = {
  success: boolean;
  error?: string;
  // Only meaningful for a check_connection_status event.
  connected?: boolean;
  // Only meaningful for a check_reply event.
  replied?: boolean;
};
