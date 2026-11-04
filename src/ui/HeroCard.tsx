import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { accentGradient, Sheen } from "./Gloss";
import { PressableScale } from "./PressableScale";

/**
 * The screen's one hero: the brand gradient (an agency's colour, if set) with two soft glass circles, white text
 * on it (`onHero`, `onHeroMuted`, `heroGlass` for pills). At most one per screen, so the eye lands there.
 * With `onPress` the whole card is the button (then it must not hold buttons of its own).
 */
export function HeroCard({ children, onPress, accessibilityLabel, style }: { children: ReactNode; onPress?: () => void; accessibilityLabel?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const look = [styles.card, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }, style];
  const inner = (
    <>
      <Sheen />
      <View style={[styles.glowA, { backgroundColor: colors.heroGlass }]} />
      <View style={[styles.glowB, { backgroundColor: colors.heroGlass }]} />
      {children}
    </>
  );
  if (!onPress) return <View style={look}>{inner}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} scaleTo={0.985} style={look}>
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xxl, padding: space.xl, gap: space.sm + 2, overflow: "hidden" },
  glowA: { position: "absolute", right: -48, top: -56, width: 180, height: 180, borderRadius: 90, opacity: 0.7 },
  glowB: { position: "absolute", right: 36, bottom: -80, width: 130, height: 130, borderRadius: 65, opacity: 0.5 },
});
