/**
 * Fast synchronous storage (MMKV) for preferences and the query cache. Never for the sign-in token —
 * that lives in the Keychain / Keystore (src/session/tokenStore.ts).
 */
import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({ id: "revenue-os" });

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
