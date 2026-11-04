import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type TileAction = { key: string; label: string; icon?: IconComponent; glyph?: ReactNode; run: () => void };

/**
 * A detail screen's main actions as big square-ish tiles in the page (Mono look, nothing pinned or floating):
 * the first is ink, the rest white; four to a row, wrapping when there are more.
 */
export function ActionTiles({ actions, style }: { actions: TileAction[]; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  if (actions.length === 0) return null;
  const perRow = Math.min(4, actions.length);
  return (
    <View style={[styles.grid, style]}>
      {actions.map((a, i) => {
        const main = i === 0;
        const fg = main ? colors.onInk : colors.text;
        return (
          <PressableScale
            key={a.key}
            onPress={() => {
              if (main) haptics.light();
              else haptics.selection();
              a.run();
            }}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            scaleTo={0.94}
            style={[styles.tile, { flexBasis: `${100 / perRow - 3}%`, backgroundColor: main ? colors.ink : colors.surface }]}
          >
            {a.glyph ?? (a.icon ? <a.icon size={21} color={fg} strokeWidth={ICON_STROKE + 0.25} /> : null)}
            <Text variant="caption" numberOfLines={1} style={{ color: fg }}>
              {a.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: gutter },
  tile: { flexGrow: 1, height: 76, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", gap: space.xs + 2, paddingHorizontal: space.xs },
});
