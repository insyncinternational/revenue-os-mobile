/**
 * Web preview only (development): there is no Keychain in a browser, so the token lives in sessionStorage and is
 * gone when the tab closes. The real app always uses tokenStore.ts.
 */
const KEY = "ros.session.token";

export async function loadToken(): Promise<string | null> {
  try {
    return globalThis.sessionStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    globalThis.sessionStorage?.setItem(KEY, token);
  } catch {
    // storage blocked
  }
}

export async function clearToken(): Promise<void> {
  try {
    globalThis.sessionStorage?.removeItem(KEY);
  } catch {
    // storage blocked
  }
}
