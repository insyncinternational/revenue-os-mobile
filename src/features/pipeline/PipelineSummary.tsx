import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, gutter, radius, space } from "@/theme/tokens";
import type { Stage, StageTotal } from "@/types/pipeline";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Text } from "@/ui/Text";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const CHART = 132;

type Props = {
  /** Open stages, in board order. */
  stages: Stage[];
  totals: Record<string, StageTotal>;
  openValue: number;
  weighted: number;
  likely: number;
  selected: number | null;
  onSelect: (id: number) => void;
  /** Full and compact money formatters in the workspace currency. */
  money: (n: number) => string;
  compact: (n: number) => string;
};

/**
 * The top of the Pipeline tab (Mono look): the open value, very large; two pills (weighted, how likely to close);
 * and a white card with one bar per open stage, growing up from the bottom — all in the brand colour, the biggest full,
 * empty stages as dashed stubs. Tapping a bar opens that stage below.
 */
export function PipelineSummary({ stages, totals, openValue, weighted, likely, selected, onSelect, money, compact }: Props) {
  const { colors } = useTheme();
  const values = stages.map((s) => totals[String(s.id)]?.value ?? 0);
  const max = Math.max(...values, 1);
  const top = values.indexOf(Math.max(...values));
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AnimatedNumber value={openValue} format={money} variant="display" style={styles.total} numberOfLines={1} adjustsFontSizeToFit />
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Text variant="footnote" weight="medium" numeric>
              {t("pipeline.weighted", { value: compact(weighted) })}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Text variant="footnote" weight="medium" numeric>
              {`${likely}% · ${t("pipeline.likely")}`}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.bars}>
          {stages.map((s, i) => {
            const v = values[i]!;
            const active = s.id === selected;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  if (!active) {
                    haptics.selection();
                    onSelect(s.id);
                  }
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${s.name}: ${v > 0 ? money(v) : "0"}`}
                style={styles.col}
              >
                {v > 0 ? (
                  <>
                    <Text variant="eyebrow" numeric numberOfLines={1} style={[styles.value, { color: colors.text }]}>
                      {compact(v)}
                    </Text>
                    <Bar height={Math.max(14, (v / max) * CHART)} color={colors.primaryFill} faded={i !== top} index={i} />
                  </>
                ) : (
                  <View style={[styles.stub, { borderColor: colors.borderStrong }]} />
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.labels}>
          {stages.map((s) => (
            <Text
              key={s.id}
              variant="caption"
              align="center"
              numberOfLines={1}
              style={[styles.label, s.id === selected ? { color: colors.text, fontFamily: fonts.semibold } : { color: colors.textMuted }]}
            >
              {s.name}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/** One stage's bar: solid brand colour, as on Today's pipeline card; the biggest stage full, the others lighter. */
function Bar({ height, color, faded, index }: { height: number; color: string; faded: boolean; index: number }) {
  const reduce = useReducedMotion();
  const h = useSharedValue(reduce ? height : 0);
  useEffect(() => {
    h.set(reduce ? height : withDelay(200 + index * 90, withTiming(height, { duration: 800, easing: EASE })));
  }, [height, index, reduce, h]);
  const style = useAnimatedStyle(() => ({ height: h.get() }));
  return <Animated.View style={[styles.bar, { backgroundColor: color, opacity: faded ? 0.38 : 1 }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter, gap: space.lg },
  head: { gap: space.sm + 2 },
  total: { fontSize: 52, lineHeight: 58, letterSpacing: -2.2 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pill: { height: 32, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center" },
  card: { borderRadius: radius.xxl, padding: space.lg + 2, paddingBottom: space.md + 2, gap: space.sm + 2 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: space.sm + 2, height: CHART + 22 },
  col: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 6 },
  value: { textTransform: "none", letterSpacing: 0 },
  bar: { alignSelf: "stretch", borderRadius: radius.sm + 2 },
  stub: { alignSelf: "stretch", height: 14, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: "dashed" },
  labels: { flexDirection: "row", gap: space.sm + 2 },
  label: { flex: 1 },
});
