import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { go, openMeeting } from "@/lib/navigate";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { KpiMetric, MeetingRow, PipelineOverview } from "@/types/home";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
/** A meeting counts as "now" from 15 minutes before it starts until an hour after. */
const NOW_BEFORE = 15 * 60_000;
const NOW_AFTER = 60 * 60_000;

type Props = { pipeline: PipelineOverview | null; won: KpiMetric | null; sinceDays: number; currency: string; meetings: MeetingRow[] };

/**
 * Today's glance, under "Up next" (the Mono mock): the open pipeline as a white card with a barcode bar, then two
 * tiles — won in the period, and the next meeting (glossy deep brand, "Now" with a pulse while it's on).
 * Each part shows only when there's something to say.
 */
export function Glance({ pipeline, won, sinceDays, currency, meetings }: Props) {
  const [now] = useState(() => Date.now());
  const next = pickMeeting(meetings, now);
  const openDeals = pipeline?.bars.reduce((n, b) => n + b.count, 0) ?? 0;
  const showPipeline = pipeline != null && openDeals > 0;
  const showWon = won != null;
  if (!showPipeline && !showWon && !next) return null;
  return (
    <View style={styles.wrap}>
      {showPipeline ? <PipelineCard pipeline={pipeline} deals={openDeals} /> : null}
      {showWon || next ? (
        <View style={styles.row}>
          {showWon ? <WonTile metric={won} sinceDays={sinceDays} currency={currency} /> : null}
          {next ? <MeetingTile meeting={next} now={now} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** The meeting for the tile: the one on now or next today, else the latest one from earlier today. */
function pickMeeting(meetings: MeetingRow[], now: number): MeetingRow | undefined {
  const start = new Date(now).setHours(0, 0, 0, 0);
  const end = start + 86_400_000;
  const today = meetings
    .filter((m) => m.due_at && m.status !== "cancelled" && Date.parse(m.due_at) >= start && Date.parse(m.due_at) < end)
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  return today.find((m) => Date.parse(m.due_at!) + NOW_AFTER >= now) ?? today[today.length - 1];
}

function amountParts(value: number, currency: string, locale: string): { code: string; number: string } {
  return { code: currency, number: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value)) };
}

function PipelineCard({ pipeline, deals }: { pipeline: PipelineOverview; deals: number }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const total = pipeline.total_value;
  const valued = pipeline.bars.filter((b) => b.value > 0);
  const top = valued.reduce((best, b) => (b.value > (best?.value ?? -1) ? b : best), valued[0]);
  const fmt = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  return (
    <PressableScale
      onPress={() => go("/pipeline")}
      accessibilityRole="button"
      accessibilityLabel={`${t("pipeline.openValue")}: ${pipeline.currency} ${fmt(total)}, ${deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}`}
      scaleTo={0.985}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={styles.between}>
        <Text variant="footnote" tone="muted">
          {t("pipeline.openValue")}
        </Text>
        <Text variant="caption" tone="muted">
          {deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}
        </Text>
      </View>
      <View style={styles.amount}>
        <Text variant="headline" tone="muted" weight="medium">
          {`${amountParts(total, pipeline.currency, locale).code} `}
        </Text>
        <AnimatedNumber value={total} format={fmt} variant="display" style={styles.big} numberOfLines={1} adjustsFontSizeToFit />
      </View>
      {total > 0 ? (
        <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {valued.map((b, i) => (
            <Segment key={b.stage_id} share={b.value / total} index={i} solid={b === top} />
          ))}
        </View>
      ) : null}
      <View style={styles.legend}>
        {valued.map((b) => (
          <Text key={b.stage_id} variant="caption" tone="muted" numberOfLines={1}>
            {`${b.label} ${fmt(b.value)}`}
          </Text>
        ))}
      </View>
    </PressableScale>
  );
}

/** One stage's share of the bar: the biggest one solid and glossy, the others drawn as a barcode of thin lines. */
function Segment({ share, index, solid }: { share: number; index: number; solid: boolean }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const grow = useSharedValue(reduce ? 1 : 0);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!reduce) grow.set(withDelay(250 + index * 120, withTiming(1, { duration: 900, easing: EASE })));
  }, [reduce, index, grow]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.get() }] }));
  const lines = Math.max(1, Math.floor(width / 7));
  return (
    <Animated.View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segment, { flexGrow: Math.max(share, 0.06) }, styles.fromStart, style, solid && { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}
    >
      {solid ? null : (
        <View style={styles.lines}>
          {Array.from({ length: lines }, (_, i) => (
            <View key={i} style={[styles.line, { backgroundColor: colors.primaryFill }]} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function WonTile({ metric, sinceDays, currency }: { metric: KpiMetric; sinceDays: number; currency: string }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const fmt = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n));
  return (
    <PressableScale
      onPress={() => go("/pipeline")}
      accessibilityRole="button"
      accessibilityLabel={`${t("today.wonDays", { days: sinceDays })}: ${currency} ${fmt(metric.value)}`}
      scaleTo={0.97}
      style={[styles.tile, { backgroundColor: colors.surface }]}
    >
      <Text variant="footnote" tone="muted" numberOfLines={1}>
        {t("today.wonDays", { days: sinceDays })}
      </Text>
      {metric.kind === "currency" ? (
        // Money reads the same everywhere: a small currency code before the number ("AED 12,000").
        <View style={styles.amount}>
          <Text variant="footnote" tone="muted" weight="medium">{`${currency} `}</Text>
          <AnimatedNumber value={metric.value} format={fmt} variant="metric" numberOfLines={1} adjustsFontSizeToFit style={styles.tileNumber} />
        </View>
      ) : (
        <>
          <AnimatedNumber value={metric.value} format={fmt} variant="metric" numberOfLines={1} adjustsFontSizeToFit style={styles.tileNumber} />
          <Text variant="caption" tone="muted">
            {t("today.deals")}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

function MeetingTile({ meeting, now }: { meeting: MeetingRow; now: number }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const start = Date.parse(meeting.due_at!);
  const live = start - NOW_BEFORE <= now && now <= start + NOW_AFTER;
  const label = live ? t("today.nowLabel") : start > now ? t("today.nextLabel") : t("today.earlierLabel");
  return (
    <PressableScale
      onPress={() => openMeeting(meeting.task_id)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${timeOfDay(meeting.due_at!, locale)}, ${meeting.title}`}
      scaleTo={0.97}
      style={[styles.tile, styles.clip, { backgroundColor: colors.contrast, backgroundImage: `linear-gradient(150deg, ${colors.primaryFill} 0%, ${colors.contrast} 75%)` }]}
    >
      <Sheen strength={0.7} />
      <View style={styles.liveRow}>
        <Pulse on={live} color={colors.heroGlow} />
        <Text variant="footnote" style={{ color: colors.onContrastMuted }}>
          {label}
        </Text>
      </View>
      <Text variant="metric" numeric numberOfLines={1} adjustsFontSizeToFit style={[styles.tileNumber, { color: colors.onContrast }]}>
        {timeOfDay(meeting.due_at!, locale)}
      </Text>
      <Text variant="caption" numberOfLines={1} style={{ color: colors.onContrastMuted }}>
        {meeting.title}
      </Text>
    </PressableScale>
  );
}

function Pulse({ on, color }: { on: boolean; color: string }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (on && !reduce) o.set(withRepeat(withSequence(withTiming(0.35, { duration: 800 }), withTiming(1, { duration: 800 })), -1));
  }, [on, reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: 0.75 + 0.25 * o.get() }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  card: { borderRadius: radius.xl + 4, padding: space.xl, paddingVertical: space.lg + 2, gap: space.xs },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm },
  amount: { flexDirection: "row", alignItems: "baseline" },
  big: { flexShrink: 1, fontSize: 38, lineHeight: 44, letterSpacing: -1.4 },
  bar: { flexDirection: "row", gap: 4, height: 28, marginTop: space.sm },
  segment: { height: 28, borderRadius: radius.sm, overflow: "hidden" },
  fromStart: { transformOrigin: "left" },
  lines: { flex: 1, flexDirection: "row", gap: 4 },
  line: { width: 3, height: 28, borderRadius: 1.5 },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", columnGap: space.md, rowGap: 2, marginTop: space.xs },
  row: { flexDirection: "row", gap: space.md },
  tile: { flex: 1, minWidth: 0, borderRadius: radius.xl + 4, padding: space.lg + 2, gap: 4 },
  clip: { overflow: "hidden" },
  tileNumber: { marginTop: space.xs },
  liveRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
