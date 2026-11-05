import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { accentGradient, Sheen } from "./Gloss";

/**
 * The one highlight per screen (a summary, an amount): the hero card, the same brand fill and gloss as the
 * greeting, Up next and the pool card, so every highlight in the app is one colour. Text and meters inside use
 * `onHero`, `onHeroMuted` and `heroGlass`. No shadow: it stands out by colour.
 */
export function ContrastBlock({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }, style]}>
      <Sheen strength={0.6} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.xxl, padding: space.xl, gap: space.lg, overflow: "hidden" },
});
