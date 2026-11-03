/** Sign-in and account endpoints (backend routes/mobile.ts → the web's routes/auth.ts handlers). */
import type { User } from "@/types/session";
import { api, request } from "./client";

export type SignedIn = { user: User; token: string; expires_at: string | null };
export type TwoFactorRequired = { requires_2fa: true; challenge_token: string };

/** Pure guard: a sign-in answer carrying a session. */
export function isSignedIn(r: unknown): r is SignedIn {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  const user = o.user as Record<string, unknown> | undefined;
  return typeof o.token === "string" && o.token.length > 20 && !!user && typeof user.id === "number" && typeof user.email === "string";
}

export function isTwoFactorRequired(r: unknown): r is TwoFactorRequired {
  return !!r && typeof r === "object" && (r as Record<string, unknown>).requires_2fa === true && typeof (r as Record<string, unknown>).challenge_token === "string";
}

export const authApi = {
  login: (email: string, password: string) => request<SignedIn | TwoFactorRequired>("/mobile/auth/login", { method: "POST", body: { email, password }, auth: false }),

  twoFactor: (challenge_token: string, code: string) =>
    request<SignedIn & { used_recovery_code?: boolean }>("/mobile/auth/login/2fa", { method: "POST", body: { challenge_token, code }, auth: false }),

  /** Uses the given token (not the session's), so it can run from the refresh handler itself. */
  refresh: (token: string) => request<SignedIn>("/mobile/auth/refresh", { method: "POST", body: {}, auth: false, headers: { Authorization: `Bearer ${token}` } }),

  logout: (token: string) => request<{ ok: true }>("/mobile/auth/logout", { method: "POST", body: {}, auth: false, headers: { Authorization: `Bearer ${token}` }, timeoutMs: 5000 }),

  /** A fresh binding for Google sign-in: `bind` (hash) goes to the browser, `secret` stays in the app. */
  oauthBind: () => request<{ bind: string; secret: string }>("/mobile/auth/oauth/bind", { method: "POST", body: {}, auth: false }),

  /** The one-time ticket Google sign-in returned → a session (with the binding secret only this app has). */
  oauthHandover: (handover: string, bind_secret: string) => request<SignedIn>("/mobile/auth/oauth/handover", { method: "POST", body: { handover, bind_secret }, auth: false }),

  requestPasswordReset: (email: string) => request<{ ok: true }>("/auth/password-reset/request", { method: "POST", body: { email }, auth: false }),

  me: () => api.get<{ user: User }>("/auth/me"),

  /** Settings → Profile on the web: name, company, time zone (email is not editable). */
  updateProfile: (body: { name?: string; company?: string; timezone?: string }) => api.put<{ user: User }>("/auth/profile", body),

  /** Ends every other session; returns this phone's fresh one. */
  changePassword: (current_password: string, new_password: string) => api.post<{ ok: true; token: string; expires_at: string | null }>("/mobile/auth/change-password", { current_password, new_password }),

  /** Asks the platform admins to close the account (they get an in-app request). */
  requestDeletion: () => api.post<{ ok?: boolean; message?: string }>("/auth/account/deletion-request"),

  sendVerificationEmail: () => api.post<{ success?: boolean; message?: string }>("/auth/verify-email/send"),

  confirmVerificationCode: (code: string) => api.post<{ success: true }>("/auth/verify-email/confirm-code", { code }),

  config: () => request<{ min_app_version: string; websocket_url: string | null }>("/mobile/config", { auth: false, timeoutMs: 8000 }),
};
