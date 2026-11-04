import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/** One action on the bar: a lucide `icon`, or a ready-made `glyph` (a brand logo in its own colours). */
export type BarAction = { key: string; label: string; icon?: IconComponent; glyph?: ReactNode; run: () => void };

/** Room to leave under a screen's content so its last row clears the bar (add the bottom inset). */
export const BOTTOM_BAR_SPACE = 104;

/**
 * The screen's main actions pinned at the bottom, a thumb away, over a soft fade into the page: one ink pill
 * (`main`) and up to three round buttons (`more`). Place it after the scroll view, inside the same parent.
 */
export function BottomActionBar({ main, more = [] }: { main: BarAction; more?: BarAction[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(180deg, transparent, ${colors.background} 42%)` }]} pointerEvents="none" />
      <PressableScale
        onPress={() => {
          haptics.light();
          main.run();
        }}
        accessibilityRole="button"
        accessibilityLabel={main.label}
        scaleTo={0.97}
        style={[styles.main, { backgroundColor: colors.ink }]}
      >
        {main.glyph ?? (main.icon ? <main.icon size={19} color={colors.onInk} strokeWidth={ICON_STROKE + 0.25} /> : null)}
        <Text variant="callout" weight="semibold" style={{ color: colors.onInk }} numberOfLines={1}>
          {main.label}
        </Text>
      </PressableScale>
      {more.slice(0, 3).map((r) => (
        <PressableScale
          key={r.key}
          onPress={() => {
            haptics.selection();
            r.run();
          }}
          accessibilityRole="button"
          accessibilityLabel={r.label}
          scaleTo={0.94}
          style={[styles.round, { backgroundColor: colors.surface, boxShadow: colors.cardShadow }]}
        >
          {r.glyph ?? (r.icon ? <r.icon size={21} color={colors.text} strokeWidth={ICON_STROKE + 0.25} /> : null)}
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: space.sm + 2, paddingHorizontal: gutter, paddingTop: space.xxl },
  main: { flex: 1, height: 56, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
