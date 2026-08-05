const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Root override, only settable via the SUPERADMIN_EMAILS env var — always a
// superadmin regardless of profiles.role, so an admin-panel mistake can
// never lock every admin out at once.
export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

// Combined check: the env-var root list, or a profile promoted to
// superadmin from /admin/users (profiles.role).
export function isSuperadminUser(email: string | null | undefined, role: string | null | undefined): boolean {
  return isSuperadminEmail(email) || role === "superadmin";
}
