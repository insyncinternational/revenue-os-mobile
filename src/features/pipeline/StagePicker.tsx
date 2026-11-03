import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type Stage = { id: number; name: string };

/**
 * Pick a deal's stage as one progress track: every stage up to the chosen one fills in, so it reads as "how far
 * along" rather than a wrap of loose chips. Up to four stages share the width; more scroll sideways in one row.
 */
export function StagePicker({ stages, value, onChange }: { stages: Stage[]; value: number | null; onChange: (id: number) => void }) {
  const { colors } = useTheme();
  const at = stages.findIndex((s) => s.id === value);
  const fit = stages.length <= 4;
  const items = stages.map((s, i) => {
    const reached = at >= 0 && i <= at;
    const selected = i === at;
    return (
      <Pressable
        key={s.id}
        onPress={() => {
          if (!selected) haptics.selection();
          onChange(s.id);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={s.name}
        hitSlop={{ top: 8, bottom: 8 }}
        style={fit ? styles.fill : styles.fixed}
      >
        <View style={[styles.bar, { backgroundColor: reached ? colors.primaryFill : colors.surfaceTertiary }]} />
        <Text variant="footnote" weight={selected ? "semibold" : "medium"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: selected ? colors.primary : reached ? colors.text : colors.textMuted }}>
          {s.name}
        </Text>
      </Pressable>
    );
  });
  return fit ? (
    <View style={styles.row}>{items}</View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs + 2 },
  fill: { flex: 1, minWidth: 0, gap: space.xs + 2 },
  fixed: { width: 96, gap: space.xs + 2 },
  bar: { height: 6, borderRadius: radius.pill },
});
