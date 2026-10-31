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

export function Chip({ label, selected, count, icon: Icon, onPress }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.primaryText : colors.textSecondary;
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
          backgroundColor: selected ? (pressed ? colors.primarySubtlePressed : colors.primarySubtle) : pressed ? colors.pressed : colors.surface,
          borderColor: selected ? colors.primaryBorder : colors.border,
        },
      ]}
    >
      {Icon ? <Icon size={15} color={fg} strokeWidth={ICON_STROKE} /> : null}
      <Text variant="subhead" weight={selected ? "semibold" : "medium"} style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {count != null && count > 0 ? (
        <Text variant="caption" numeric style={{ color: selected ? colors.primaryText : colors.textMuted }}>
          {count > 99 ? "99+" : count}
        </Text>
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
  chip: { height: 34, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.md, flexDirection: "row", alignItems: "center", gap: space.xs + 2 },
  row: { paddingHorizontal: gutter, gap: space.sm, alignItems: "center" },
  endSpacer: { width: space.xs },
});
