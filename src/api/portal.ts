/**
 * The customer portal for the phone (backend /api/mobile/portal/* for sign-in, /api/portal/* for everything else).
 * A customer's session is separate from staff sign-in: its own Bearer token per business, never the staff token
 * (requests go with `auth: false` so the staff refresh / sign-out handling never runs for a customer).
 */
import type { PortalBranding, PortalDocument, PortalInvoice, PortalMeeting, PortalMessage, PortalSignedIn } from "@/types/portal";
import { ApiError } from "./errors";
import { buildUrl, request, type RequestOptions } from "./client";

/** A fresh token for the same session (refresh, password change). */
export type PortalToken = { token: string; expires_at: string | null };

const slugPath = (slug: string) => encodeURIComponent(slug.trim().toLowerCase());

/** Called when the server says a customer session is over (signed out elsewhere, blocked, portal switched off). */
let onEnded: (token: string, err: ApiError) => void = () => {};
export function setPortalSessionEnded(fn: (token: string, err: ApiError) => void): void {
  onEnded = fn;
}

/** A request with a customer's token. A 401 / 403 ends that business's session on this phone. */
async function withToken<T>(token: string, path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await request<T>(path, { ...opts, auth: false, headers: { ...opts.headers, Authorization: `Bearer ${token}` } });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || (e.status === 403 && /PORTAL_(DISABLED|ACCESS|BLOCKED|UNAVAILABLE)/.test(e.code ?? "")))) onEnded(token, e);
    throw e;
  }
}

export const portalAuthApi = {
  /** The business's name, logo and colours (404 when the code is unknown or its portal is off). */
  branding: (slug: string, signal?: AbortSignal) => request<{ portal: PortalBranding }>(`/portal/${slugPath(slug)}`, { auth: false, signal }),
  /** Emails a 6-digit sign-in code; always `{ ok: true }` (never says whether the email is a customer). */
  requestCode: (slug: string, email: string) => request<{ ok: true; dev_code?: string }>(`/mobile/portal/${slugPath(slug)}/request-code`, { method: "POST", body: { email }, auth: false }),
  verifyCode: (slug: string, email: string, code: string) => request<PortalSignedIn>(`/mobile/portal/${slugPath(slug)}/verify-code`, { method: "POST", body: { email, code }, auth: false }),
  login: (slug: string, email: string, password: string) => request<PortalSignedIn>(`/mobile/portal/${slugPath(slug)}/login`, { method: "POST", body: { email, password }, auth: false }),
  refresh: (token: string) => withToken<PortalToken>(token, "/mobile/portal/session/refresh", { method: "POST", body: {} }),
  /** Ends the session; with `pushToken`, this phone stops getting the business's notifications too. */
  logout: (token: string, pushToken?: string | null) =>
    request<{ ok: true }>("/mobile/portal/session/logout", { method: "POST", body: pushToken ? { push_token: pushToken } : {}, auth: false, headers: { Authorization: `Bearer ${token}` }, timeoutMs: 5000 }),
  setPassword: (token: string, password: string, currentPassword?: string) =>
    withToken<PortalToken & { ok: true; has_password: true }>(token, "/mobile/portal/session/password", { method: "POST", body: { password, ...(currentPassword ? { current_password: currentPassword } : {}) } }),
  account: (token: string, signal?: AbortSignal) => withToken<{ has_password: boolean; status: string }>(token, "/portal-accounts/session", { signal }),
  registerDevice: (token: string, body: { token: string; platform: "ios" | "android"; app_version?: string | null; device_name?: string | null }) =>
    withToken<{ ok: true }>(token, "/mobile/portal/devices", { method: "POST", body }),
};

export const portalApi = {
  meetings: (token: string, signal?: AbortSignal) => withToken<{ meetings: PortalMeeting[] }>(token, "/portal/session/meetings", { signal }),
  slots: (token: string, signal?: AbortSignal) => withToken<{ slots: string[] }>(token, "/portal/session/slots", { signal }),
  book: (token: string, startsAt: string) => withToken<{ meeting: PortalMeeting }>(token, "/portal/session/meetings", { method: "POST", body: { starts_at: startsAt } }),
  reschedule: (token: string, id: number, startsAt: string) => withToken<{ meeting: PortalMeeting }>(token, `/portal/session/meetings/${id}/reschedule`, { method: "POST", body: { starts_at: startsAt } }),
  cancel: (token: string, id: number) => withToken<{ meeting: PortalMeeting }>(token, `/portal/session/meetings/${id}/cancel`, { method: "POST", body: {} }),
  messages: (token: string, signal?: AbortSignal) => withToken<{ messages: PortalMessage[] }>(token, "/portal/session/messages", { signal }),
  send: (token: string, body: string) => withToken<{ message: PortalMessage }>(token, "/portal/session/messages", { method: "POST", body: { body } }),
  invoices: (token: string, signal?: AbortSignal) => withToken<{ invoices: PortalInvoice[] }>(token, "/portal/session/invoices", { signal }),
  documents: (token: string, signal?: AbortSignal) => withToken<{ documents: PortalDocument[] }>(token, "/portal/session/documents", { signal }),
  /** Where a document downloads from (needs the customer's token as a header). */
  documentUrl: (id: number) => buildUrl(`/portal/session/documents/${id}/download`),
};
