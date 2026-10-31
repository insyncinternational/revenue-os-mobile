import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./ThemeProvider";
import type { ColorScheme, Palette } from "./tokens";

type Styles = Parameters<typeof StyleSheet.create>[0];

/**
 * Theme-aware StyleSheet. The factory runs once per palette (light, dark, agency colour), not on every render:
 *   const useStyles = makeStyles((c) => ({ row: { backgroundColor: c.surface } }));
 */
export function makeStyles<const S extends Styles>(factory: (colors: Palette, scheme: ColorScheme) => S & Styles) {
  return function useStyles(): Readonly<S> {
    const { colors, scheme } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors, scheme)), [colors, scheme]);
  };
}
