import { isSignedIn, isTwoFactorRequired } from "@/api/auth";
import { greetingKey } from "@/lib/greeting";
import type { User } from "@/types/session";
import { looksLikeEmail } from "./authFlow";
import { gateFor } from "./gate";

jest.mock("@/i18n", () => ({ getLanguage: () => "en", t: (k: string) => k }));

const base: User = { id: 1, email: "a@b.co", name: "A" };

describe("gateFor", () => {
  it("lets a verified, active user in", () => {
    expect(gateFor(base)).toBe("ok");
    expect(gateFor({ ...base, email_verified: true })).toBe("ok");
    expect(gateFor(null)).toBe("ok");
  });
  it("stops an unverified email", () => {
    expect(gateFor({ ...base, email_verified: false })).toBe("verifyEmail");
  });
  it("paused wins over unverified", () => {
    const paused = { ...base, email_verified: false, branding: { source: "agency" as const, name: "Acme", logo_url: null, primary_color: null, accent_color: null, account_paused: { reason: "client" as const, paused_at: null, archived: false } } };
    expect(gateFor(paused)).toBe("paused");
  });
});

describe("sign-in answers", () => {
  const token = "x".repeat(40);
  it("recognises a session", () => {
    expect(isSignedIn({ token, user: { id: 3, email: "a@b.co" }, expires_at: null })).toBe(true);
    expect(isSignedIn({ user: { id: 3, email: "a@b.co" } })).toBe(false);
    expect(isSignedIn({ token: "short", user: { id: 3, email: "a@b.co" } })).toBe(false);
    expect(isSignedIn(null)).toBe(false);
  });
  it("recognises the 2FA step", () => {
    expect(isTwoFactorRequired({ requires_2fa: true, challenge_token: "c" })).toBe(true);
    expect(isTwoFactorRequired({ requires_2fa: false })).toBe(false);
  });
});

describe("small checks", () => {
  it("accepts plausible emails only", () => {
    expect(looksLikeEmail(" sara@northwind.ae ")).toBe(true);
    expect(looksLikeEmail("sara@northwind")).toBe(false);
    expect(looksLikeEmail("sara northwind.ae")).toBe(false);
  });
  it("greets by the hour", () => {
    expect(greetingKey(7)).toBe("today.greetingMorning");
    expect(greetingKey(12)).toBe("today.greetingAfternoon");
    expect(greetingKey(19)).toBe("today.greetingEvening");
    // Same edges as the web dashboard: 17:00 is still afternoon, small hours are evening.
    expect(greetingKey(17)).toBe("today.greetingAfternoon");
    expect(greetingKey(18)).toBe("today.greetingEvening");
    expect(greetingKey(2)).toBe("today.greetingEvening");
    expect(greetingKey(5)).toBe("today.greetingMorning");
  });
});
