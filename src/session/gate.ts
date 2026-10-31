import type { User } from "@/types/session";

/** Signed in, but stopped before the app: email not verified yet, or the account is paused by its agency. */
export type SessionGate = "ok" | "verifyEmail" | "paused";

/** Pure: which gate a user's own record puts them behind. Paused wins (verifying wouldn't help). */
export function gateFor(user: User | null): SessionGate {
  if (!user) return "ok";
  if (user.branding?.account_paused) return "paused";
  if (user.email_verified === false) return "verifyEmail";
  return "ok";
}
