/** The sign-in token, in the iOS Keychain / Android Keystore. Readable after the first unlock (needed for push taps). */
import * as SecureStore from "expo-secure-store";

const KEY = "ros.session.token";
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY, OPTIONS);
  } catch {
    // Keychain can fail after a device restore; treat as signed out rather than crashing.
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, OPTIONS);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    // nothing stored
  }
}
