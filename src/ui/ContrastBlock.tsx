import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { palettes, radius, space } from "@/theme/tokens";
import { Sheen } from "./Gloss";

/**
 * The one highlight per screen (a summary, a chart): a deep, glossy brand card on the light page, a lifted one on the dark page,
 * so it reads as "the important bit" without more colour. Text and meters inside use `onContrast`,
 * `onContrastMuted` and `contrastTrack`. No shadow: it stands out by colour (and big shadows over a wash render
 * too dark on Android).
 */
export function ContrastBlock({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useTheme();
  // Light mode: deep brand with a glossy lift towards the brand colour; dark mode: a plain lifted grey.
  const gloss = scheme === "light" ? { backgroundImage: `linear-gradient(150deg, ${colors.heroFrom} 0%, ${colors.contrast} 70%)` } : null;
  return (
    <View style={[styles.block, { backgroundColor: colors.contrast }, gloss, style]}>
      {scheme === "light" ? <Sheen strength={0.6} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.xxl, padding: space.xl, gap: space.lg, overflow: "hidden" },
});

/**
 * A status colour (good / getting there / poor) for a meter on the block. The block is dark in both themes, so it
 * takes the dark theme's brighter shades: the light theme's are deep, for text on white, and turn muddy on black.
 */
export function contrastStatus(tone: "success" | "warning" | "danger"): string {
  return palettes.dark[tone];
}
