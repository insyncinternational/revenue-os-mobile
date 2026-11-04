import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Stage, StageTotal } from "@/types/pipeline";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/** `money`: formats a stage's open value, shown beside its count when the user may see amounts. */
type Props = { stages: Stage[]; totals: Record<string, StageTotal>; selected: number | null; onSelect: (id: number) => void; money?: (n: number) => string };

/** Stages as swipeable pills with their deal count (and value); the selected one is ink and stays in view. */
export function StageTabs({ stages, totals, selected, onSelect, money }: Props) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<number, number>>({});

  useEffect(() => {
    if (selected != null && positions.current[selected] != null) scroll.current?.scrollTo({ x: Math.max(0, positions.current[selected]! - gutter), animated: true });
  }, [selected]);

  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {stages.map((s) => {
        const active = s.id === selected;
        const n = totals[String(s.id)]?.count ?? 0;
        const value = money && (totals[String(s.id)]?.value ?? 0) > 0 ? money(totals[String(s.id)]!.value) : null;
        return (
          <View key={s.id} onLayout={(e) => (positions.current[s.id] = e.nativeEvent.layout.x)}>
            <PressableScale
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={[s.name, n, value].filter((x) => x != null).join(", ")}
              onPress={() => {
                if (!active) {
                  haptics.selection();
                  onSelect(s.id);
                }
              }}
              // Mono look: the selected stage is an ink pill, the rest plain white pills.
              style={[styles.tab, { backgroundColor: active ? colors.ink : colors.surface }]}
            >
              <Text variant="subhead" weight={active ? "semibold" : "medium"} style={{ color: active ? colors.onInk : colors.text }} numberOfLines={1}>
                {s.name}
              </Text>
              {value ? (
                <Text variant="footnote" numeric weight="medium" style={{ color: active ? colors.onInk : colors.textMuted, opacity: active ? 0.75 : 1 }} numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <View style={[styles.count, { backgroundColor: active ? colors.primaryFill : colors.surfaceTertiary }]}>
                <Text variant="caption" numeric weight="semibold" style={{ color: active ? colors.onPrimary : colors.textMuted }}>
                  {n}
                </Text>
              </View>
            </PressableScale>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, gap: space.sm, paddingVertical: space.xs },
  tab: { flexDirection: "row", alignItems: "center", gap: space.sm, height: 40, paddingLeft: space.lg, paddingRight: space.sm, borderRadius: radius.pill },
  count: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
