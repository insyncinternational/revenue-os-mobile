/**
 * One error type for every API failure. The backend's codes are inconsistent (some missing, `account_paused` is
 * lowercase), so `kind` is derived from `code` first, then from the HTTP status — screens switch on `kind` only.
 */
import { t, type TranslationKey } from "@/i18n";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "suspended"
  | "paused"
  | "emailNotVerified"
  | "moduleDisabled"
  | "forbidden"
  | "notFound"
  | "validation"
  | "credits"
  | "rateLimited"
  | "server"
  | "unknown";

export type FieldError = { path: string; message: string };

type Body = { error?: unknown; message?: unknown; code?: unknown; details?: unknown; module?: unknown; paused?: unknown };

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string | null;
  readonly body: Body | null;
  /** Seconds to wait (429). */
  readonly retryAfter: number | null;

  constructor(kind: ApiErrorKind, status: number, message: string, code: string | null = null, body: Body | null = null, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.body = body;
    this.retryAfter = retryAfter;
  }

  /** Field errors from a 422 / 400 validation response, if any. */
  get fieldErrors(): FieldError[] {
    const d = this.body?.details;
    if (!Array.isArray(d)) return [];
    return d
      .filter((x): x is { path: unknown; message: unknown } => typeof x === "object" && x !== null && "message" in x)
      .map((x) => ({ path: Array.isArray(x.path) ? x.path.join(".") : String(x.path ?? ""), message: String(x.message) }));
  }

  /** Module id for `moduleDisabled`. */
  get module(): string | null {
    return typeof this.body?.module === "string" ? this.body.module : null;
  }
}

/** Pure: maps an HTTP failure to an error kind. */
export function kindFor(status: number, code: string | null): ApiErrorKind {
  switch (code) {
    // Sign-in answers: the person typed something wrong (401/400/429 with a friendly server message), not a dead session.
    case "INVALID_CREDENTIALS":
    case "TWO_FACTOR_INVALID":
    case "TWO_FACTOR_EXPIRED":
      return "validation";
    case "SESSION_REVOKED":
    case "SESSION_EXPIRED":
    case "IMPERSONATION_EXPIRED":
    case "INVALID_TOKEN":
      return "unauthorized";
    case "ACCOUNT_SUSPENDED":
      return "suspended";
    case "account_paused":
    case "ACCOUNT_PAUSED":
      return "paused";
    case "EMAIL_NOT_VERIFIED":
      return "emailNotVerified";
    case "MODULE_DISABLED":
    case "feature_not_in_plan":
      return "moduleDisabled";
    case "USER_RATE_LIMITED":
      return "rateLimited";
    case "DATABASE_UNAVAILABLE":
      return "server";
  }
  if (status === 401) return "unauthorized";
  if (status === 402) return "credits";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "server";
  return "unknown";
}

const friendly: Partial<Record<ApiErrorKind, TranslationKey>> = {
  network: "error.network",
  timeout: "error.timeout",
  server: "error.server",
  rateLimited: "error.rateLimited",
  forbidden: "error.permission",
  notFound: "error.notFound",
  unauthorized: "error.sessionEnded",
  suspended: "error.suspended",
  credits: "error.credits",
};

/**
 * The message to show a person. Validation and business errors keep the server's own (already friendly) text;
 * transport and generic failures get our wording. Never shows raw technical text.
 */
export function userMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const key = friendly[err.kind];
    if (err.kind === "validation" || err.kind === "unknown" || err.kind === "paused" || err.kind === "moduleDisabled") {
      return err.message || t("state.errorMessage");
    }
    return key ? t(key) : t("state.errorMessage");
  }
  return t("state.errorMessage");
}
