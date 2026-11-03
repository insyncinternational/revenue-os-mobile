import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { create } from "zustand";

type Style = "light" | "dark";

/**
 * Screens with a coloured header (Today's hero) ask for light status-bar icons here; the root's <StatusBar> reads it.
 * One owner for the style — an imperative setStatusBarStyle() was overwritten whenever the root re-rendered.
 */
export const useStatusBarOverride = create<{ style: Style | null; set: (s: Style | null) => void }>((set) => ({
  style: null,
  set: (style) => set({ style }),
}));

/** While this screen is in front, the status bar uses `style`; it goes back to the theme's when the screen loses focus. */
export function useScreenStatusBar(style: Style): void {
  const setStyle = useStatusBarOverride((s) => s.set);
  useFocusEffect(
    useCallback(() => {
      setStyle(style);
      return () => setStyle(null);
    }, [style, setStyle])
  );
}
