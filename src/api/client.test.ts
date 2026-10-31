import { buildUrl, request, setAuthHandlers } from "./client";
import { ApiError, kindFor, userMessage } from "./errors";

jest.mock("@/i18n", () => ({ getLanguage: () => "en", t: (k: string) => k }));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("buildUrl", () => {
  it("prefixes /api and skips empty query values", () => {
    expect(buildUrl("/inbox/unified", { base_id: 7, channel: "all", search: "", x: undefined, y: null })).toBe("http://localhost:4000/api/inbox/unified?base_id=7&channel=all");
  });
  it("encodes values", () => {
    expect(buildUrl("leads", { search: "a&b c" })).toBe("http://localhost:4000/api/leads?search=a%26b%20c");
  });
});

describe("kindFor", () => {
  it("prefers the backend code over the status", () => {
    expect(kindFor(403, "account_paused")).toBe("paused");
    expect(kindFor(403, "EMAIL_NOT_VERIFIED")).toBe("emailNotVerified");
    expect(kindFor(403, "MODULE_DISABLED")).toBe("moduleDisabled");
    expect(kindFor(403, "ACCOUNT_SUSPENDED")).toBe("suspended");
    expect(kindFor(503, "DATABASE_UNAVAILABLE")).toBe("server");
  });
  it("falls back to the status when there is no code", () => {
    expect(kindFor(401, null)).toBe("unauthorized");
    expect(kindFor(402, null)).toBe("credits");
    expect(kindFor(422, null)).toBe("validation");
    expect(kindFor(429, null)).toBe("rateLimited");
    expect(kindFor(500, null)).toBe("server");
  });
});

describe("request", () => {
  const fetchMock = jest.fn();
  let token: string | null;
  let refresh: jest.Mock;
  let ended: jest.Mock;
  let blocked: jest.Mock;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    token = "old";
    refresh = jest.fn(async () => {
      token = "new";
      return "ok";
    });
    ended = jest.fn();
    blocked = jest.fn();
    setAuthHandlers({ getToken: () => token, refresh, onSessionEnded: ended, onBlocked: blocked });
  });

  it("sends the bearer token and language, and never cookies", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await request("/me");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer old");
    expect(init.headers["Accept-Language"]).toBe("en");
    expect(init.credentials).toBe("omit");
  });

  it("refreshes once for many parallel 401s, then retries each request", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer new" ? jsonResponse(200, { ok: true }) : jsonResponse(401, { error: "Invalid token" });
    });
    const results = await Promise.all([request("/a"), request("/b"), request("/c")]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(ended).not.toHaveBeenCalled();
  });

  it("ends the session when the server refuses the refresh", async () => {
    refresh.mockResolvedValueOnce("ended");
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Session revoked", code: "SESSION_REVOKED" }));
    await expect(request("/me")).rejects.toMatchObject({ kind: "unauthorized" });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh can't reach the server", async () => {
    refresh.mockResolvedValueOnce("transient");
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Invalid token" }));
    await expect(request("/me")).rejects.toMatchObject({ kind: "network" });
    expect(ended).not.toHaveBeenCalled();
  });

  it("reports a paused account or unverified email as blocked, not signed out", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: "Verify your email first.", code: "EMAIL_NOT_VERIFIED" }));
    await expect(request("/home")).rejects.toMatchObject({ kind: "emailNotVerified" });
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(ended).not.toHaveBeenCalled();
  });

  it("does not refresh for sign-in calls, and shows the server's wrong-password message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "That email and password don't match.", code: "INVALID_CREDENTIALS" }));
    const err = await request("/mobile/auth/login", { method: "POST", body: {}, auth: false }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
    expect(userMessage(err)).toBe("That email and password don't match.");
  });

  it("maps a paused account and keeps the server message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: "This account is paused by your agency.", code: "account_paused" }));
    const err = await request("/home").catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: "paused", status: 403 });
    expect(userMessage(err)).toBe("This account is paused by your agency.");
  });

  it("returns validation field errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { error: "Validation Error", message: "Email is invalid", details: [{ path: ["email"], message: "Invalid email" }] }));
    const err = (await request("/leads", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe("validation");
    expect(err.fieldErrors).toEqual([{ path: "email", message: "Invalid email" }]);
  });

  it("turns a network failure into a friendly network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    const err = await request("/me").catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: "network" });
    expect(userMessage(err)).toBe("error.network");
  });
});
