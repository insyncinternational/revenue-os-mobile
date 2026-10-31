import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";
import { brandPalette } from "./brand";
import { palettes, type ColorScheme, type Palette } from "./tokens";
import { storage, StorageKeys } from "@/lib/storage";

export type ThemePreference = "system" | "light" | "dark";

type ThemeValue = {
  scheme: ColorScheme;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function readPreference(): ThemePreference {
  const v = storage.getString(StorageKeys.themePreference);
  return v === "light" || v === "dark" ? v : "system";
}

/**
 * Light / dark follows the phone unless the user picks one. `brandColor` (an agency's primary colour) re-tints the
 * brand roles; everything else keeps the Revenue OS palette.
 */
export function ThemeProvider({ brandColor, children }: { brandColor?: string | null; children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const scheme: ColorScheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const setPreference = useCallback((p: ThemePreference) => {
    storage.set(StorageKeys.themePreference, p);
    setPreferenceState(p);
  }, []);

  // Native controls (keyboard, alerts, date pickers) follow the same choice.
  useEffect(() => {
    if (Platform.OS !== "web") Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  }, [preference]);

  const colors = useMemo<Palette>(() => {
    const base = palettes[scheme];
    return { ...base, ...brandPalette(brandColor, scheme, base.surface) };
  }, [scheme, brandColor]);

  // The root view behind every screen: no white flash during transitions in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const value = useMemo(() => ({ scheme, colors, preference, setPreference }), [scheme, colors, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
