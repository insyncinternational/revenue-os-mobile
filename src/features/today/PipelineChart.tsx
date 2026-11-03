import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { getIntlLocale, t } from "@/i18n";
import { money } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { PipelineOverview } from "@/types/home";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { stageShade, stageShares } from "./charts";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Open pipeline at a glance: the total counting up, one bar split by stage (each stage a shade of the brand colour,
 * growing in from the left), and a legend with counts and values. Hidden when money isn't visible to the user.
 */
/** `showTotal` false when Today's highlight card already shows the pipeline value (no number twice). */
export function PipelineChart({ pipeline, showTotal = true }: { pipeline: PipelineOverview; showTotal?: boolean }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const deals = pipeline.bars.reduce((n, b) => n + b.count, 0);
  const shares = stageShares(pipeline.bars.map((b) => b.value));
  const n = pipeline.bars.length;
  return (
    <Card elevated contentStyle={styles.body}>
      <View style={styles.head}>
        {showTotal ? <AnimatedNumber value={pipeline.total_value} format={(v) => money(v, pipeline.currency, locale, { compact: v >= 100_000 })} variant="title" /> : null}
        <Text variant={showTotal ? "subhead" : "headline"} tone={showTotal ? "muted" : "default"}>
          {deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceTertiary }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {pipeline.bars.map((b, i) => (shares[i]! > 0 ? <Segment key={b.stage_id} share={shares[i]!} shade={stageShade(i, n)} color={colors.primary} index={i} /> : null))}
      </View>
      <View style={styles.legend}>
        {pipeline.bars.map((b, i) => (
          <View key={b.stage_id} style={styles.row} accessible accessibilityLabel={`${b.label}: ${b.count}, ${money(b.value, pipeline.currency, locale)}`}>
            <View style={[styles.dot, { backgroundColor: colors.primary, opacity: stageShade(i, n) }]} />
            <Text variant="subhead" weight="medium" numberOfLines={1} style={styles.flex} tone={b.count ? "default" : "muted"}>
              {b.label}
            </Text>
            <Text variant="footnote" tone="muted" numeric>
              {b.count ? `${b.count} · ${money(b.value, pipeline.currency, locale, { compact: true })}` : "—"}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Segment({ share, shade, color, index }: { share: number; shade: number; color: string; index: number }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(reduce ? share : 0);
  useEffect(() => {
    w.set(reduce ? share : withDelay(150 + index * 90, withTiming(share, { duration: 700, easing: EASE })));
  }, [share, index, reduce, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return <Animated.View style={[styles.segment, { backgroundColor: color, opacity: shade }, style]} />;
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  head: { gap: 2 },
  track: { flexDirection: "row", height: 14, borderRadius: radius.pill, overflow: "hidden", gap: 2 },
  segment: { height: 14 },
  legend: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1, minWidth: 0 },
});
