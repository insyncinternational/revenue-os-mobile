import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/**
 * One list at a time on a detail screen (contact, deal): pill tabs, the selected one ink, the rest white (Mono
 * look). Scrolls sideways when the names don't fit. `style` places the row (its margins).
 */
export function UnderlineTabs<K extends string>({ tabs, value, onChange, style }: { tabs: { key: K; label: string }[]; value: K; onChange: (key: K) => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabs, style]} accessibilityRole="tablist">
      {tabs.map((x) => {
        const active = x.key === value;
        return (
          <PressableScale
            key={x.key}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(x.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            scaleTo={0.96}
            style={[styles.tab, { backgroundColor: active ? colors.ink : colors.surface }]}
          >
            <Text variant="subhead" weight={active ? "semibold" : "medium"} style={{ color: active ? colors.onInk : colors.text }} numberOfLines={1}>
              {x.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: space.sm - 2, paddingHorizontal: gutter },
  tab: { height: 40, paddingHorizontal: space.lg, borderRadius: radius.pill, justifyContent: "center" },
});
