import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type TileAction = { key: string; label: string; icon?: IconComponent; glyph?: ReactNode; run: () => void };

/** Size of each round button (the same as Today's shortcuts). */
export const ACTION_CIRCLE = 52;

/** Pure: buttons per row, so rows stay balanced (6 → 3 + 3, 5 → 3 + 2, 7 → 4 + 3), never more than four. */
export function actionsPerRow(n: number): number {
  return n <= 4 ? Math.max(n, 1) : Math.min(4, Math.ceil(n / 2));
}

/**
 * A detail screen's main actions (call, email, note…): one white card of round grey buttons with a short label
 * under each, the same look as Today's shortcuts, so every "do something" row in the app reads the same.
 * Buttons keep one column width, so a second row lines up under the first.
 */
export function ActionTiles({ actions, style }: { actions: TileAction[]; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  if (actions.length === 0) return null;
  const width = `${100 / actionsPerRow(actions.length)}%` as const;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.card, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}>
        {actions.map((a) => (
          <PressableScale
            key={a.key}
            onPress={() => {
              haptics.selection();
              a.run();
            }}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            scaleTo={0.94}
            style={[styles.action, { width }]}
          >
            <View style={[styles.circle, { backgroundColor: colors.surfaceSecondary }]}>
              {a.glyph ?? (a.icon ? <a.icon size={22} color={colors.text} strokeWidth={ICON_STROKE + 0.25} /> : null)}
            </View>
            <Text variant="caption" weight="semibold" tone="secondary" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {a.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter },
  card: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, paddingVertical: space.lg, paddingHorizontal: space.xs, borderRadius: radius.xl + 4 },
  action: { alignItems: "center", gap: space.sm, paddingHorizontal: 2 },
  circle: { width: ACTION_CIRCLE, height: ACTION_CIRCLE, borderRadius: ACTION_CIRCLE / 2, alignItems: "center", justifyContent: "center" },
});
