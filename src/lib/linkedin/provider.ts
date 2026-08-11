// The LinkedIn integration boundary: the execution engine (src/lib/execution)
// talks to this interface, never to Playwright/DOM specifics directly. This
// is what makes the rest of the platform fully functional and testable
// regardless of how (or how reliably) LinkedIn automation itself behaves —
// per the product spec: "isolate that integration behind a proper
// provider/service interface so the rest of the platform can still be
// fully functional."
//
// The real implementation lives in runner/index.js (a separate Playwright
// process, not part of this Next.js build) as a plain object shaped to
// match this interface method-for-method — see the `linkedInProvider`
// object there. The two aren't type-checked against each other (different
// runtimes/toolchains), so treat this file as the contract: if you add or
// change a method here, mirror it in runner/index.js's provider object, and
// vice versa.
//
// See src/lib/sequences/types.ts's IMPLEMENTED_ACTION_TYPES for which of
// these currently have a real, working implementation vs. exist as a typed
// contract with no functional backend yet.

export type LinkedInActionResult = {
  success: boolean;
  error?: string;
};

export type ConnectionStatusResult = LinkedInActionResult & {
  status?: "not_connected" | "pending" | "connected";
};

export type ConversationMessage = {
  fromProspect: boolean;
  text: string;
  sentAt: string;
};

export type ConversationResult = LinkedInActionResult & {
  messages?: ConversationMessage[];
};

export type ProfileResult = LinkedInActionResult & {
  headline?: string;
  location?: string;
  company?: string;
  position?: string;
};

export interface LinkedInProvider {
  // Read the prospect's profile page (used by view_profile steps, and as a
  // best-effort enrichment source for fields the import flow left empty).
  getProfile(profileUrl: string): Promise<ProfileResult>;

  // Same navigation as getProfile, but the intent is the visit itself (a
  // signal to the prospect), not reading data back — kept as a distinct
  // method so the engine's activity log records "viewed profile" as its
  // own event rather than an incidental side effect of a data read.
  viewProfile(profileUrl: string): Promise<LinkedInActionResult>;

  sendConnectionRequest(profileUrl: string, note?: string): Promise<LinkedInActionResult>;

  sendMessage(profileUrl: string, text: string): Promise<LinkedInActionResult>;

  likePost(profileUrl: string): Promise<LinkedInActionResult>;

  followProfile(profileUrl: string): Promise<LinkedInActionResult>;

  getConnectionStatus(profileUrl: string): Promise<ConnectionStatusResult>;

  getConversation(profileUrl: string): Promise<ConversationResult>;
}
