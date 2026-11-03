/**
 * Saved data for an instant start: the first page of a few key screens is written to MMKV and restored before the
 * first render, then refreshed in the background. No extra library — React Query's own dehydrate/hydrate.
 */
import { AppState } from "react-native";
import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { getLanguage } from "@/i18n";
import { readJson, storage, StorageKeys, writeJson } from "@/lib/storage";

/** Query-key roots worth keeping between launches (first pages only; see keys.ts). */
const PERSISTED_ROOTS = new Set(["home", "inbox", "contacts", "pipeline", "meetings", "tasks", "invoices", "notifications", "me"]);
const MAX_AGE_MS = 24 * 60 * 60_000;
const VERSION = 1;

/** `lang`: server-written text (labels, notifications) comes in the app language, so another language's cache is dropped. */
type Saved = { v: number; at: number; lang?: string; state: ReturnType<typeof dehydrate> };

export function restoreQueryCache(client: QueryClient): void {
  const saved = readJson<Saved>(StorageKeys.queryCache);
  if (!saved || saved.v !== VERSION || saved.lang !== getLanguage() || Date.now() - saved.at > MAX_AGE_MS) {
    storage.remove(StorageKeys.queryCache);
    return;
  }
  hydrate(client, saved.state);
  // Saved data is shown at once but is never trusted as current: every screen refreshes it quietly when it
  // opens (stale-while-revalidate). Without this, data saved seconds ago would skip the refresh.
  void client.invalidateQueries({ refetchType: "none" });
}

export function saveQueryCache(client: QueryClient): void {
  const state = dehydrate(client, {
    shouldDehydrateQuery: (q) => q.state.status === "success" && PERSISTED_ROOTS.has(String(q.queryKey[0])) && q.meta?.persist !== false,
  });
  writeJson(StorageKeys.queryCache, { v: VERSION, at: Date.now(), lang: getLanguage(), state } satisfies Saved);
}

export function clearQueryCache(client: QueryClient): void {
  client.clear();
  storage.remove(StorageKeys.queryCache);
}

/** Saves when the app goes to the background (the moment it might be killed). Returns an unsubscribe. */
export function persistOnBackground(client: QueryClient): () => void {
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "background" || s === "inactive") saveQueryCache(client);
  });
  return () => sub.remove();
}
