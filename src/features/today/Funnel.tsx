import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { getIntlLocale, t } from "@/i18n";
import { count } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { KpiMetric } from "@/types/home";
import { Card } from "@/ui/Card";
import { CalendarCheck, ICON_STROKE, MessageCircle, Send, TrendingDown, Trophy, Users, type IconComponent } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { biggestDrop, stageShade, type FunnelStep } from "./charts";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const ICONS: Record<FunnelStep["key"], IconComponent> = {
  leads_found: Users,
  contacted: Send,
  positive_replies: MessageCircle,
  meetings: CalendarCheck,
  won: Trophy,
};

/**
 * From a found lead to a won deal for the period: one row per step with its count and a bar (a deeper shade of
 * the brand colour at each step, growing in), the share that made it from the step before, and a footer naming
 * the biggest drop — where the user's next hour does the most good.
 */
export function Funnel({ steps, metrics }: { steps: FunnelStep[]; metrics: KpiMetric[] }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const labelOf = (key: FunnelStep["key"]) => (key === "won" ? t("today.funnelWon") : (metrics.find((m) => m.key === key)?.label ?? key));
  const drop = biggestDrop(steps);
  const before = drop ? steps[steps.indexOf(drop) - 1] : undefined;

  return (
    <Card elevated contentStyle={styles.body}>
      {steps.map((s, i) => {
        const Icon = ICONS[s.key];
        const label = labelOf(s.key);
        const rate = s.rate != null ? pct.format(s.rate) : null;
        return (
          <View
            key={s.key}
            style={styles.step}
            accessible
            accessibilityLabel={rate ? `${label}: ${count(s.value, locale)}, ${rate}` : `${label}: ${count(s.value, locale)}`}
          >
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
                <Icon size={14} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} />
              </View>
              <Text variant="subhead" weight="medium" numberOfLines={1} style={styles.flex} tone={s.value ? "default" : "muted"}>
                {label}
              </Text>
              {rate ? (
                <View style={[styles.rate, { backgroundColor: colors.surfaceTertiary }]}>
                  <Text variant="caption" tone="muted" numeric>
                    {rate}
                  </Text>
                </View>
              ) : null}
              <Text variant="headline" numeric style={styles.value}>
                {count(s.value, locale)}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceTertiary }]}>
              <Bar share={s.share} shade={stageShade(i, steps.length)} color={colors.primary} index={i} />
            </View>
          </View>
        );
      })}
      {drop && before ? (
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <TrendingDown size={15} color={colors.warning} strokeWidth={ICON_STROKE + 0.5} />
          <Text variant="footnote" tone="muted" style={styles.flex}>
            {t("today.funnelDrop", { step: labelOf(drop.key), rate: pct.format(drop.rate!), before: labelOf(before.key) })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function Bar({ share, shade, color, index }: { share: number; shade: number; color: string; index: number }) {
  const reduce = useReducedMotion();
  // A sliver even at zero, so the empty step still reads as part of the funnel.
  const target = Math.max(share, 0.02);
  const w = useSharedValue(reduce ? target : 0);
  useEffect(() => {
    w.set(reduce ? target : withDelay(150 + index * 80, withTiming(target, { duration: 700, easing: EASE })));
  }, [target, index, reduce, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return <Animated.View style={[styles.fill, { backgroundColor: color, opacity: shade }, style]} />;
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  step: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: { width: 24, height: 24, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0 },
  rate: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
  value: { minWidth: 28, textAlign: "right" },
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill },
  footer: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md, borderTopWidth: 1 },
});
