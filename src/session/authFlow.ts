import { create } from "zustand";

/**
 * In-memory hand-off between sign-in steps. The 2FA challenge never goes in a route param (params end up in
 * navigation state and deep-link URLs).
 */
export const useAuthFlow = create<{ email: string; challenge: string | null; setEmail: (e: string) => void; setChallenge: (c: string | null) => void }>((set) => ({
  email: "",
  challenge: null,
  setEmail: (email) => set({ email }),
  setChallenge: (challenge) => set({ challenge }),
}));

/** Pure: a plausible email address (the server decides the rest). */
export function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
