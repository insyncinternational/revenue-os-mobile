/**
 * "Continue with Google": the backend's own Google sign-in, opened in the phone's auth browser (an
 * ASWebAuthenticationSession / Custom Tab — the app never sees the Google password). The backend sends the
 * browser back to MOBILE_OAUTH_RETURN with a one-time ticket, which is exchanged for a session together with a
 * binding secret that never left the app (backend routes/mobile.ts /auth/oauth/*).
 */
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { authApi, isSignedIn, type SignedIn } from "@/api/auth";
import { API_ORIGIN } from "@/api/config";
import { ApiError } from "@/api/errors";

/** Same as the backend's utils/mobileOAuth.ts (the app's scheme in app.json). */
export const MOBILE_OAUTH_RETURN = "revenueos://oauth";

/** The web preview can't receive the app's scheme, so the button is native only. */
export const googleSignInAvailable = Platform.OS !== "web";

export type OAuthReturn = { handover: string } | { twofa: string } | { error: string };

/** Pure: what the backend put in the return URL. Unknown or empty → an error. */
export function parseOAuthReturn(url: string): OAuthReturn {
  const query = url.split("#")[0]!.split("?")[1] ?? "";
  const p = new URLSearchParams(query);
  const handover = p.get("handover");
  if (handover) return { handover };
  const twofa = p.get("twofa");
  if (twofa) return { twofa };
  return { error: p.get("error") || "unknown" };
}

export type GoogleSignInResult = { kind: "signedIn"; result: SignedIn } | { kind: "twoFactor"; challenge: string } | { kind: "cancelled" } | { kind: "error"; code: string };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const { bind, secret } = await authApi.oauthBind();
  const start = `${API_ORIGIN}/api/auth/google?app=1&bind=${encodeURIComponent(bind)}`;
  const res = await WebBrowser.openAuthSessionAsync(start, MOBILE_OAUTH_RETURN);
  if (res.type !== "success") return { kind: "cancelled" };
  const back = parseOAuthReturn(res.url);
  if ("twofa" in back) return { kind: "twoFactor", challenge: back.twofa };
  if ("error" in back) return { kind: "error", code: back.error };
  const result = await authApi.oauthHandover(back.handover, secret);
  if (!isSignedIn(result)) throw new ApiError("unknown", 200, "");
  return { kind: "signedIn", result };
}
