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
 * Open pipeline at a glance (Mono look): a white card with the total counting up, one chunky bar split by stage
 * (the biggest stage in the accent, the rest in ink shades, growing in from the left) and a legend with counts
 * and values. Hidden when money isn't visible to the user.
 * `showTotal` false when Today's highlight card already shows the pipeline value (no number twice).
 */
export function PipelineChart({ pipeline, showTotal = true }: { pipeline: PipelineOverview; showTotal?: boolean }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const deals = pipeline.bars.reduce((n, b) => n + b.count, 0);
  const shares = stageShares(pipeline.bars.map((b) => b.value));
  const n = pipeline.bars.length;
  const top = shares.indexOf(Math.max(...shares));
  const colorAt = (i: number) => (i === top ? colors.primaryFill : colors.ink);
  const shadeAt = (i: number) => (i === top ? 1 : stageShade(i, n));
  return (
    <Card contentStyle={styles.card}>
      <View style={styles.head}>
        <Text variant="footnote" tone="muted">
          {deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}
        </Text>
        {showTotal ? <AnimatedNumber value={pipeline.total_value} format={(v) => money(v, pipeline.currency, locale, { compact: v >= 100_000 })} variant="display" style={styles.total} numberOfLines={1} adjustsFontSizeToFit /> : null}
      </View>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {pipeline.bars.map((b, i) => (shares[i]! > 0 ? <Segment key={b.stage_id} share={shares[i]!} shade={shadeAt(i)} color={colorAt(i)} index={i} /> : null))}
      </View>
      <View style={styles.legend}>
        {pipeline.bars.map((b, i) => (
          <View key={b.stage_id} style={styles.row} accessible accessibilityLabel={`${b.label}: ${b.count}, ${money(b.value, pipeline.currency, locale)}`}>
            <View style={[styles.dot, { backgroundColor: b.count ? colorAt(i) : colors.surfaceTertiary, opacity: b.count ? shadeAt(i) : 1 }]} />
            <Text variant="subhead" weight="medium" numberOfLines={1} style={[styles.flex, { color: b.count ? colors.text : colors.textMuted }]}>
              {b.label}
            </Text>
            <Text variant="eyebrow" numeric style={{ color: colors.textMuted, textTransform: "none", letterSpacing: 0.2 }}>
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
    w.set(reduce ? share : withDelay(150 + index * 90, withTiming(share, { duration: 800, easing: EASE })));
  }, [share, index, reduce, w]);
  const style = useAnimatedStyle(() => ({ flexGrow: 0, width: `${w.value * 100}%` }));
  return <Animated.View style={[styles.segment, { backgroundColor: color, opacity: shade }, style]} />;
}

const styles = StyleSheet.create({
  card: { gap: space.lg, padding: space.xl },
  head: { gap: 2 },
  total: { fontSize: 40, lineHeight: 46, letterSpacing: -1.6 },
  track: { flexDirection: "row", height: 28, gap: 4, overflow: "hidden" },
  segment: { height: 28, borderRadius: radius.sm },
  legend: { gap: space.sm + 2 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 3 },
  flex: { flex: 1, minWidth: 0 },
});
