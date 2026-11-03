import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, type IconComponent } from "./icons";
import { Text } from "./Text";

type ChipProps = {
  label: string;
  selected?: boolean;
  count?: number;
  icon?: IconComponent;
  onPress?: () => void;
};

/** A choice pill: ink when selected, a plain card-coloured pill otherwise (no outlines), with its count in a small badge. */
export function Chip({ label, selected, count, icon: Icon, onPress }: ChipProps) {
  const { colors, scheme } = useTheme();
  const fg = selected ? colors.onInk : colors.textSecondary;
  const countBg = selected ? (scheme === "dark" ? "rgba(17, 17, 20, 0.12)" : "rgba(255, 255, 255, 0.2)") : colors.surfaceTertiary;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? (pressed ? colors.inkPressed : colors.ink) : pressed ? colors.pressed : colors.surface,
          // A hairline keeps an unselected pill visible on a white card as well as on the grey page.
          borderColor: selected ? colors.ink : colors.border,
        },
      ]}
    >
      {Icon ? <Icon size={15} color={fg} strokeWidth={ICON_STROKE} /> : null}
      <Text variant="subhead" weight={selected ? "semibold" : "medium"} style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {count != null && count > 0 ? (
        <View style={[styles.count, { backgroundColor: countBg }]}>
          <Text variant="caption" numeric weight="semibold" style={{ color: fg, fontSize: 11, lineHeight: 14 }}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export type FilterOption<K extends string> = { key: K; label: string; count?: number; icon?: IconComponent };

/** One-line, horizontally scrolling filter row (single choice). Bleeds to the screen edges. */
export function FilterChips<K extends string>({ options, value, onChange }: { options: FilterOption<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {options.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          count={o.count}
          icon={o.icon}
          selected={o.key === value}
          onPress={() => {
            if (o.key !== value) {
              haptics.selection();
              onChange(o.key);
            }
          }}
        />
      ))}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { height: 34, borderRadius: radius.pill, paddingHorizontal: space.md + 2, flexDirection: "row", alignItems: "center", gap: space.xs + 2, borderWidth: 1 },
  count: { minWidth: 20, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  row: { paddingHorizontal: gutter, gap: space.sm, alignItems: "center" },
  endSpacer: { width: space.xs },
});
