// The action-type registry for sequence steps. Deliberately a closed list
// (not a free string) so a typo fails fast, but every consumer — the
// execution engine (src/lib/execution/engine.ts), the runner, the UI step
// picker — should treat this as a registry to look up, never re-implement
// as its own parallel switch statement. Adding a new type means adding one
// entry here, one LinkedInProvider method, and one engine case — nothing
// else should need touching.
//
// "send_message" covers both a campaign's opening message and every
// follow-up after it — the old system special-cased "step 0" as
// structurally different from the rest; this one doesn't. A step's
// position in the sequence (and its own message_template/aiPrompt) is what
// makes it a follow-up, not a different action_type. The UI is free to
// *label* later send_message steps "Follow-up #2" etc., but that's
// presentation, not schema.
export const SEQUENCE_ACTION_TYPES = [
  "view_profile",
  "send_connection_request",
  "send_message",
  "like_recent_post",
  "follow_profile",
  "manual_linkedin_action",
] as const;
export type SequenceActionType = (typeof SEQUENCE_ACTION_TYPES)[number];

// Which action types have a real, working LinkedInProvider implementation
// today vs. exist in the schema/engine but aren't executable yet — see
// src/lib/linkedin/provider.ts. The UI uses this to grey out / label
// unimplemented steps rather than silently pretending they'll run.
export const IMPLEMENTED_ACTION_TYPES: SequenceActionType[] = [
  "send_connection_request",
  "send_message",
];

export const EXECUTION_MODES = ["automatic", "manual"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

// Interpreted by the execution engine when deciding whether/how to advance
// a campaign_prospect past this step:
// - waitFor: block this step from becoming due until the condition holds
//   (checked by the engine on each tick, not a fixed delay).
// - ifReplied / ifNoReply: what happens to the REST of the sequence once
//   this step's outcome is known, not to this step itself.
// - skipIfFailed: if true, a failure here doesn't halt the sequence, it
//   just moves on to the next step at its normal scheduled time.
export type SequenceStepConditions = {
  waitFor?: "connection_accepted";
  ifReplied?: "stop" | "continue";
  ifNoReply?: "continue" | "stop";
  skipIfFailed?: boolean;
};

export type SequenceStep = {
  id: string;
  campaignId: string;
  position: number;
  actionType: SequenceActionType;
  executionMode: ExecutionMode;
  delayMinutes: number;
  messageTemplate: string | null;
  aiPrompt: string | null;
  conditions: SequenceStepConditions;
};

export type SequenceStepInput = {
  actionType: SequenceActionType;
  executionMode: ExecutionMode;
  delayMinutes: number;
  messageTemplate?: string | null;
  aiPrompt?: string | null;
  conditions?: SequenceStepConditions;
};

export function newSequenceStepInput(actionType: SequenceActionType): SequenceStepInput {
  const needsMessage = actionType === "send_message";
  return {
    actionType,
    executionMode: "automatic",
    delayMinutes: 0,
    messageTemplate: needsMessage ? "" : null,
    aiPrompt: null,
    conditions: actionType === "send_connection_request" ? {} : { ifReplied: "stop" },
  };
}
