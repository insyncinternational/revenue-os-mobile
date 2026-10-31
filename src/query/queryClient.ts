import { AppState, Platform } from "react-native";
import * as Network from "expo-network";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";

/** Errors worth retrying: the network or a temporary server problem. Never a 4xx — retrying can't fix those. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === "network" || error.kind === "timeout" || error.kind === "server") return failureCount < 2;
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 5000),
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Writes are never repeated automatically — a retried "send" could send twice.
      retry: false,
    },
  },
});

/** "Window focus" on a phone = the app coming back to the front. Nothing refetches while it is in the background. */
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener("change", (s) => setFocused(s === "active"));
  return () => sub.remove();
});

/** Pauses queries while offline and refetches stale data when the connection comes back. */
onlineManager.setEventListener((setOnline) => {
  if (Platform.OS === "web") return undefined;
  const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
  return () => sub.remove();
});
