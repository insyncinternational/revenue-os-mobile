/**
 * The one HTTP client. Sends the sign-in token as `Authorization: Bearer`, the device language as
 * `Accept-Language`, times out, and on a 401 runs ONE shared token refresh and retries once.
 *
 * The session layer plugs in through setAuthHandlers() so this file has no dependency on it (and stays testable).
 */
import { getLanguage } from "@/i18n";
import { API_ORIGIN, REQUEST_TIMEOUT_MS } from "./config";
import { ApiError, kindFor } from "./errors";

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** false for sign-in calls (no token, no refresh on 401). */
  auth?: boolean;
  /** Extra headers (e.g. the token refresh sends its own Authorization). */
  headers?: Record<string, string>;
  timeoutMs?: number;
};

type AuthHandlers = {
  getToken: () => string | null;
  /**
   * Gets a new token. "ok": retry with it. "ended": the server refused (signed out elsewhere, expired).
   * "transient": no answer (offline, timeout) — keep the session and fail only this request.
   */
  refresh: () => Promise<RefreshOutcome>;
  /** Called once the session is definitely over (refresh failed, account suspended). */
  onSessionEnded: (reason: ApiError) => void;
  /** The account is signed in but blocked: paused by its agency, or email not verified yet. */
  onBlocked: (reason: ApiError) => void;
};

export type RefreshOutcome = "ok" | "ended" | "transient";

let handlers: AuthHandlers = {
  getToken: () => null,
  refresh: async () => "ended",
  onSessionEnded: () => {},
  onBlocked: () => {},
};

export function setAuthHandlers(h: AuthHandlers): void {
  handlers = h;
}

/** All concurrent 401s wait for the same refresh: the old token dies 60 s after a refresh, so only one may run. */
let refreshing: Promise<RefreshOutcome> | null = null;

export function refreshOnce(): Promise<RefreshOutcome> {
  if (!refreshing) {
    refreshing = handlers.refresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export function buildUrl(path: string, query?: Query): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_ORIGIN}/api${p}`;
  if (!query) return url;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `${url}?${parts.join("&")}` : url;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFrom(res: Response, body: unknown): ApiError {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const code = typeof b?.code === "string" ? b.code : null;
  const message = typeof b?.message === "string" && b.message ? b.message : typeof b?.error === "string" ? b.error : "";
  const retryHeader = res.headers.get("Retry-After");
  const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : null;
  return new ApiError(kindFor(res.status, code), res.status, message, code, b, retryAfter);
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const { method = "GET", query, body, signal, auth = true, timeoutMs = REQUEST_TIMEOUT_MS } = opts;
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": getLanguage(), ...opts.headers };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? handlers.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // The token is the session; never send or store cookies (a stray cookie would win over the token server-side).
      credentials: "omit",
    });
  } catch (e) {
    if (signal?.aborted) throw e; // caller cancelled (screen left): let React Query drop it silently
    if (timedOut) throw new ApiError("timeout", 0, "Request timed out");
    throw new ApiError("network", 0, e instanceof Error ? e.message : "Network request failed");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  let res = await send(path, opts);

  if (res.status === 401 && auth && handlers.getToken()) {
    const outcome = await refreshOnce();
    if (outcome === "transient") throw new ApiError("network", 0, "Could not refresh the session");
    if (outcome === "ok") res = await send(path, opts);
    if (outcome === "ended" || res.status === 401) {
      const err = errorFrom(res, await parseBody(res));
      handlers.onSessionEnded(err);
      throw err;
    }
  }

  const body = await parseBody(res);
  if (!res.ok) {
    const err = errorFrom(res, body);
    if (auth && err.kind === "suspended") handlers.onSessionEnded(err);
    if (auth && (err.kind === "paused" || err.kind === "emailNotVerified")) handlers.onBlocked(err);
    throw err;
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: "POST", body: body ?? {}, query }),
  put: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: "PUT", body: body ?? {}, query }),
  patch: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: "PATCH", body: body ?? {}, query }),
  delete: <T>(path: string, query?: Query) => request<T>(path, { method: "DELETE", query }),
};
