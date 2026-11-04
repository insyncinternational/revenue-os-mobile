import { StyleSheet, View } from "react-native";
import { withAlpha } from "@/theme/brand";
import { useTheme } from "@/theme/ThemeProvider";
import type { Area } from "@/theme/tokens";

/** How far the glow runs up behind a pull-to-refresh. */
const OVERSCROLL = 240;

/**
 * A warm glow of the brand colour (an agency's, if set) behind the top of a main screen: two soft radial lights
 * fading into the page, so no screen opens on flat grey. Put it first inside the header; it scrolls with the
 * content and never takes taps. `area` is kept for callers (every area shares the one accent).
 */
export function Backdrop({ underBar }: { area: Area; underBar?: boolean }) {
  const { colors, scheme } = useTheme();
  const a = scheme === "dark" ? 0.2 : 0.26;
  const image = `radial-gradient(ellipse at 88% 18%, ${withAlpha(colors.primaryFill, a)} 0%, transparent 58%), radial-gradient(ellipse at 0% 48%, ${withAlpha(colors.heroGlow, a * 0.55)} 0%, transparent 52%)`;
  return <View pointerEvents="none" style={[styles.fill, underBar && styles.underBar, { backgroundImage: image }]} />;
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: -40, right: -40, top: -OVERSCROLL, bottom: -60 },
  underBar: { top: 0 },
});

/** The top bar of a pushed screen: the page colour, so the bar and the page read as one surface. */
export function useAreaHeaderStyle(_area: Area): { backgroundColor: string } {
  const { colors } = useTheme();
  return { backgroundColor: colors.background };
}
