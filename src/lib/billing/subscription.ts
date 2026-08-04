export const TRIAL_DAYS = 14;
export const TRIAL_EXTEND_DAYS = 14;

export type SubscriptionStatus = "trialing" | "active" | "expired" | "canceled";

export type BillingProfile = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
};

export function isAccessBlocked(profile: BillingProfile): boolean {
  if (profile.subscriptionStatus === "active") return false;
  if (profile.subscriptionStatus === "canceled" || profile.subscriptionStatus === "expired") return true;
  if (!profile.trialEndsAt) return false;
  return new Date(profile.trialEndsAt).getTime() < Date.now();
}
