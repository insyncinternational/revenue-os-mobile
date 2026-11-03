import { parseOAuthReturn } from "./googleSignIn";

jest.mock("expo-web-browser", () => ({}));
jest.mock("@/api/auth", () => ({ authApi: {}, isSignedIn: () => false }));
jest.mock("@/api/errors", () => ({ ApiError: class {} }));

describe("parseOAuthReturn", () => {
  it("reads the handover ticket", () => {
    expect(parseOAuthReturn("revenueos://oauth?handover=abc.def")).toEqual({ handover: "abc.def" });
  });
  it("reads a 2FA challenge", () => {
    expect(parseOAuthReturn("revenueos://oauth?twofa=chal")).toEqual({ twofa: "chal" });
  });
  it("reads errors, and treats anything else as unknown", () => {
    expect(parseOAuthReturn("revenueos://oauth?error=no_account")).toEqual({ error: "no_account" });
    expect(parseOAuthReturn("revenueos://oauth")).toEqual({ error: "unknown" });
  });
});
