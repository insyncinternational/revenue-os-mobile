import { Redirect } from "expo-router";

/**
 * Google sign-in's return link (revenueos://oauth, session/googleSignIn.ts). expo-web-browser reads it from the auth
 * session; if Android also hands it to the app as a deep link, there's nothing to show — go home.
 */
export default function OAuthReturn() {
  return <Redirect href="/" />;
}
