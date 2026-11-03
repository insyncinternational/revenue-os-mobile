import { create } from "zustand";

/**
 * The launch intro (ui/LaunchIntro.tsx) plays once per cold start. Screens under it wait for `introDone` before
 * playing their own entrance, so it isn't spent behind the cover.
 */
export const useLaunch = create<{ introDone: boolean; finishIntro: () => void }>((set) => ({
  introDone: false,
  finishIntro: () => set({ introDone: true }),
}));
