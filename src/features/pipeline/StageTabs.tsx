import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { haptics } from "@/lib/haptics";
import { withAlpha } from "@/theme/brand";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Stage, StageTotal } from "@/types/pipeline";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/** `money`: formats a stage's open value, shown beside its count when the user may see amounts. */
type Props = { stages: Stage[]; totals: Record<string, StageTotal>; selected: number | null; onSelect: (id: number) => void; money?: (n: number) => string };

/** Stages as swipeable tabs — each with its own colour and deal count; the selected one stays in view. */
export function StageTabs({ stages, totals, selected, onSelect, money }: Props) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const stageColor = (s: Stage) => s.color ?? colors.primary;
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
              // The selected stage wears its own colour (border, wash, count), so you always know where you are.
              style={[styles.tab, active ? { backgroundColor: withAlpha(stageColor(s), 0.12), borderColor: stageColor(s), boxShadow: colors.cardShadow } : { backgroundColor: "transparent", borderColor: colors.border }]}
            >
              <View style={[styles.dot, { backgroundColor: s.color ?? colors.primary }]} />
              <Text variant="subhead" weight={active ? "semibold" : "medium"} tone={active ? "default" : "secondary"} numberOfLines={1}>
                {s.name}
              </Text>
              {value ? (
                <Text variant="footnote" numeric weight="semibold" style={{ color: active ? colors.text : colors.textSecondary }} numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <View style={[styles.count, { backgroundColor: active ? withAlpha(stageColor(s), 0.22) : colors.surfaceTertiary }]}>
                <Text variant="caption" numeric weight={active ? "semibold" : undefined} style={{ color: active ? colors.text : colors.textMuted }}>
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
  tab: { flexDirection: "row", alignItems: "center", gap: space.sm, height: 38, paddingLeft: space.md, paddingRight: space.sm, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  count: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
