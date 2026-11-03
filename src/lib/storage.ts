/**
 * Fast synchronous storage (MMKV) for preferences and the query cache. Never for the sign-in token —
 * that lives in the Keychain / Keystore (src/session/tokenStore.ts).
 *
 * Encrypted (AES-256) on phones: the query cache holds customers' names, emails, phones and message
 * previews for offline use. The key is made once from secure random bytes and kept in the Keychain /
 * Keystore with the sign-in token's access rule (after first unlock, this device only), so push taps
 * and background saves can still read it. Everything here is a cache or a preference: when the key is
 * missing (a restored phone) or the store can't be opened with it, it starts empty rather than failing.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { createMMKV, type MMKV } from "react-native-mmkv";

const STORE_ID = "revenue-os";
const KEY_NAME = "ros.storage.key";
const KEY_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

/** 16 secure random bytes as 32 hex characters: AES-256 takes a key of up to 32 bytes. */
export function newStorageKey(bytes: Uint8Array = getRandomBytes(16)): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function openStorage(): MMKV {
  // Web has no Keychain; its storage is the browser's (and the sign-in token is not in it either).
  if (Platform.OS === "web") return createMMKV({ id: STORE_ID });
  try {
    const existing = SecureStore.getItem(KEY_NAME, KEY_OPTIONS);
    if (existing) return createMMKV({ id: STORE_ID, encryptionKey: existing, encryptionType: "AES-256" });
    // First run with encryption. The key is kept first: if that fails, nothing has been encrypted and the
    // store simply stays as it was until the next launch. Then what is there is encrypted in place.
    const key = newStorageKey();
    SecureStore.setItem(KEY_NAME, key, KEY_OPTIONS);
    const store = createMMKV({ id: STORE_ID });
    try {
      store.encrypt(key, "AES-256");
    } catch {
      // A store left by a lost key (restored phone) can't be read anyway: start it fresh, encrypted.
      store.clearAll();
      store.encrypt(key, "AES-256");
    }
    return store;
  } catch {
    // Keychain unavailable right now: keep the store working (unencrypted) rather than signing the person
    // out; the next launch encrypts it.
    return createMMKV({ id: STORE_ID });
  }
}

export const storage = openStorage();

export function readJson<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

export const StorageKeys = {
  themePreference: "pref.theme",
  language: "pref.language",
  user: "session.user",
  expiresAt: "session.expiresAt",
  activeBaseId: "session.activeBaseId",
  queryCache: "cache.queries",
} as const;
