import { useEffect } from "react";
import { AppState, Linking, Platform } from "react-native";
import { router } from "expo-router";
import { create } from "zustand";

type PendingCall = { leadId: number; name: string; at: number };

/** A call started from the app, waiting for the person to come back and say how it went. */
export const useCallFollowUp = create<{ pending: PendingCall | null; start: (leadId: number, name: string) => void; clear: () => void }>((set) => ({
  pending: null,
  start: (leadId, name) => set({ pending: { leadId, name, at: Date.now() } }),
  clear: () => set({ pending: null }),
}));

function openLogSheet(p: PendingCall) {
  router.push({ pathname: "/log-call", params: { leadId: String(p.leadId), name: p.name } });
}

/** Calls a contact with the phone's own dialler and asks for the outcome when the person comes back. */
export function dial(phone: string, leadId: number, name: string) {
  beginCall(leadId, name);
  if (Platform.OS !== "web") void Linking.openURL(`tel:${phone}`).catch(() => undefined);
}

/** Remembers a call the app started, so the outcome can be logged on return. */
export function beginCall(leadId: number, name: string) {
  useCallFollowUp.getState().start(leadId, name);
  // The browser preview has no dialler: ask straight away so the flow can still be checked.
  if (Platform.OS === "web") {
    const p = useCallFollowUp.getState().pending;
    useCallFollowUp.getState().clear();
    if (p) setTimeout(() => openLogSheet(p), 300);
  }
}

/**
 * When the app comes back to the front after a call it started (at least a few seconds later — not a
 * cancelled dial), the "How did the call go?" sheet opens. Pending calls older than 2 hours are dropped.
 */
export function useCallFollowUpPrompt() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const p = useCallFollowUp.getState().pending;
      if (!p) return;
      const elapsed = Date.now() - p.at;
      useCallFollowUp.getState().clear();
      if (elapsed > 3_000 && elapsed < 2 * 60 * 60_000) openLogSheet(p);
    });
    return () => sub.remove();
  }, []);
}
