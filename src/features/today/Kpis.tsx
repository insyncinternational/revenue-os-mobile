import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { count, money, percentChange } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { KpiMetric } from "@/types/home";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ArrowRight, BarChart, CalendarCheck, ICON_STROKE, KanbanSquare, Plus, MessageCircle, Send, ShieldCheck, Target, TrendingDown, TrendingUp, Trophy, Users, type IconComponent } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { compareHeights, splitHighlight } from "./charts";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Pure: how a KPI's movement reads — a % change, "New", or nothing. */
export function changeLabel(m: Pick<KpiMetric, "changeKind" | "changePct">): { text: string; trend: "up" | "down" | "flat" } | null {
  if (m.changeKind === "new") return { text: t("today.newThisPeriod"), trend: "up" };
  if (m.changeKind !== "pct" || m.changePct == null) return null;
  const r = Math.round(m.changePct);
  return { text: percentChange(m.changePct), trend: r > 0 ? "up" : r < 0 ? "down" : "flat" };
}

/** Each number has its own icon, so the tiles read at a glance instead of as identical boxes. */
const LOOK: Record<string, { icon: IconComponent }> = {
  leads_found: { icon: Users },
  verified: { icon: ShieldCheck },
  contacted: { icon: Send },
  positive_replies: { icon: MessageCircle },
  qualified: { icon: Target },
  meetings: { icon: CalendarCheck },
  pipeline: { icon: KanbanSquare },
  won: { icon: Trophy },
};
const FALLBACK = { icon: TrendingUp };

/** What a number that hasn't started yet says instead of a bare "0 · No change". */
const ZERO_HINT: Record<string, TranslationKey> = {
  leads_found: "today.zero.leads",
  verified: "today.zero.verified",
  contacted: "today.zero.contacted",
  positive_replies: "today.zero.replies",
  qualified: "today.zero.qualified",
  meetings: "today.zero.meetings",
  pipeline: "today.zero.pipeline",
  won: "today.zero.won",
};

type Fmt = (n: number) => string;

/**
 * The period's numbers as a bento: one wide, brand-tinted card for the number that moved most worth seeing
 * (money first), then compact tiles. Numbers that haven't started say so in words instead of a grey zero.
 */
/**
 * `onAddDeal`: offered on the pipeline card while there are no open deals (only when the user may add one).
 * `more`: with an odd number of tiles, a tile that opens the full report fills the empty slot, so no tile is
 * left stretched across the whole row.
 */
export function Kpis({ metrics, currency, onAddDeal, more }: { metrics: KpiMetric[]; currency: string; onAddDeal?: () => void; more?: { label: string; hint: string; onPress: () => void } }) {
  const locale = getIntlLocale();
  const { highlight, tiles } = splitHighlight(metrics);
  const fmtFor =
    (m: KpiMetric): Fmt =>
    (n) =>
      m.kind === "currency" ? money(n, currency, locale, { compact: n >= 100_000 }) : count(n, locale);
  return (
    <View style={styles.wrap}>
      {highlight ? <Highlight m={highlight} fmt={fmtFor(highlight)} onAddDeal={onAddDeal} /> : null}
      <View style={styles.grid}>
        {tiles.map((m, i) => (
          <Tile key={m.key} m={m} fmt={fmtFor(m)} index={i} />
        ))}
        {more && tiles.length % 2 === 1 ? <MoreTile {...more} /> : null}
      </View>
    </View>
  );
}

/**
 * The wide card: a white card like the tiles, set apart by the brand colour on its icon, big number and bars
 * (not a solid colour block), so the eye lands here first without the screen turning purple. Follows an
 * agency's colour.
 */
function Highlight({ m, fmt, onAddDeal }: { m: KpiMetric; fmt: Fmt; onAddDeal?: () => void }) {
  const { colors } = useTheme();
  const look = LOOK[m.key] ?? FALLBACK;
  const Icon = look.icon;
  const change = changeLabel(m);
  const bars = compareHeights(m.previous, m.value);
  const zero = m.value === 0 && !change;
  const ink = { text: colors.text, muted: colors.textMuted };
  return (
    <Card elevated contentStyle={styles.highlight}>
      <View style={styles.top}>
        <View style={[styles.iconSolid, { backgroundColor: colors.primarySubtle }]}>
          <Icon size={17} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} />
        </View>
        <Text variant="subhead" weight="semibold" numberOfLines={1} style={[styles.flex, { color: ink.muted }]}>
          {m.label}
        </Text>
        {change ? <ChangeChip change={change} /> : null}
      </View>
      {/* A number that hasn't started shows its hint (below) instead of a big grey "AED 0". */}
      {zero ? null : <AnimatedNumber value={m.value} format={fmt} variant="display" style={{ color: colors.primaryText }} numberOfLines={1} adjustsFontSizeToFit />}
      {bars ? (
        <View style={styles.periods}>
          <PeriodBar label={t("today.thisPeriod")} value={fmt(m.value)} share={bars.now} color={colors.primary} track={colors.primarySubtle} ink={ink} delay={250} />
          <PeriodBar label={t("today.lastPeriod")} value={fmt(m.previous)} share={bars.prev} color={colors.primaryBorder} track={colors.primarySubtle} ink={ink} delay={350} />
        </View>
      ) : (
        <View style={styles.zeroRow}>
          <Text variant={zero ? "callout" : "footnote"} style={[styles.flex, { color: zero ? ink.text : ink.muted }]}>
            {zero ? t(ZERO_HINT[m.key] ?? "today.zero.other") : t("today.firstPeriod")}
          </Text>
          {zero && m.key === "pipeline" && onAddDeal ? <Button label={t("pipeline.add")} icon={Plus} variant="secondary" size="sm" onPress={onAddDeal} /> : null}
        </View>
      )}
    </Card>
  );
}

/** A compact tile: tinted icon and label, the number heavy, then its change, a nudge when it's still zero, or nothing. */
function Tile({ m, fmt, index }: { m: KpiMetric; fmt: Fmt; index: number }) {
  const { colors } = useTheme();
  const look = LOOK[m.key] ?? FALLBACK;
  const Icon = look.icon;
  const change = changeLabel(m);
  const bars = compareHeights(m.previous, m.value);
  const zero = m.value === 0 && !change;
  return (
    <Card style={styles.cell} contentStyle={styles.body}>
      <View style={styles.top}>
        {/* Neutral on purpose: colour belongs to the highlight card and to real movement (the change chips). */}
        <View style={[styles.icon, { backgroundColor: colors.surfaceTertiary }]}>
          <Icon size={15} color={colors.textSecondary} strokeWidth={ICON_STROKE + 0.5} />
        </View>
        <Text variant="footnote" weight="medium" tone="muted" numberOfLines={1} style={styles.flex}>
          {m.label}
        </Text>
      </View>
      {zero ? (
        // Not started yet: the hint in readable text takes the number's place.
        <Text variant="subhead" tone="secondary" numberOfLines={2} style={styles.zeroHint}>
          {t(ZERO_HINT[m.key] ?? "today.zero.other")}
        </Text>
      ) : (
        <AnimatedNumber value={m.value} format={fmt} variant="metric" numberOfLines={1} adjustsFontSizeToFit />
      )}
      {zero && !bars ? null : (
        <View style={styles.bottom}>
          {change ? (
            <ChangeChip change={change} />
          ) : zero ? null : (
            <Text variant="caption" tone="subtle" numberOfLines={1} style={styles.flex}>
              {t("today.noChange")}
            </Text>
          )}
          {bars ? <Compare prev={bars.prev} now={bars.now} color={colors.primary} track={colors.surfaceTertiary} index={index} label={t("today.vsLast", { previous: fmt(m.previous) })} /> : null}
        </View>
      )}
    </Card>
  );
}

/** The last slot of an odd grid: a quiet tile that opens the full report. */
function MoreTile({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.cell} contentStyle={[styles.body, styles.more]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${hint}`}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceTertiary }]}>
          <BarChart size={15} color={colors.textSecondary} strokeWidth={ICON_STROKE + 0.5} />
        </View>
        <Text variant="footnote" weight="medium" tone="muted" numberOfLines={1} style={styles.flex}>
          {hint}
        </Text>
      </View>
      <View style={styles.moreFoot}>
        <Text variant="headline" tone="primary" numberOfLines={1} style={styles.flex}>
          {label}
        </Text>
        <ArrowRight size={18} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} />
      </View>
    </Card>
  );
}

/** The change pill: green up, red down, grey flat. */
function ChangeChip({ change }: { change: NonNullable<ReturnType<typeof changeLabel>> }) {
  const { colors } = useTheme();
  const up = change.trend === "up";
  const down = change.trend === "down";
  const fg = up ? colors.success : down ? colors.danger : colors.textMuted;
  const bg = up ? colors.successSurface : down ? colors.dangerSurface : colors.surfaceTertiary;
  return (
    <View style={[styles.change, { backgroundColor: bg }]}>
      {up ? <TrendingUp size={13} color={fg} strokeWidth={ICON_STROKE + 0.5} /> : null}
      {down ? <TrendingDown size={13} color={fg} strokeWidth={ICON_STROKE + 0.5} /> : null}
      <Text variant="caption" numeric style={{ color: fg }}>
        {change.text}
      </Text>
    </View>
  );
}

/** One period as a labelled bar that grows in after the number counts up. */
function PeriodBar({ label, value, share, color, track, ink, delay }: { label: string; value: string; share: number; color: string; track: string; ink: { text: string; muted: string }; delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.set(withDelay(delay, withTiming(1, { duration: 800, easing: EASE })));
  }, [reduce, delay, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(share * p.value, 0.04) * 100}%` }));
  return (
    <View style={styles.period} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.periodText}>
        <Text variant="caption" style={{ color: ink.muted }}>
          {label}
        </Text>
        <Text variant="caption" weight="semibold" numeric style={{ color: ink.text }}>
          {value}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: track }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      </View>
    </View>
  );
}

/** Last period (grey) beside this period (colour), growing in after the numbers count up. */
function Compare({ prev, now, color, track, index, label }: { prev: number; now: number; color: string; track: string; index: number; label: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.set(withDelay(200 + index * 60, withTiming(1, { duration: 700, easing: EASE })));
  }, [reduce, index, p]);
  const prevStyle = useAnimatedStyle(() => ({ height: `${Math.max(prev * p.value, 0.08) * 100}%` }));
  const nowStyle = useAnimatedStyle(() => ({ height: `${Math.max(now * p.value, 0.08) * 100}%` }));
  return (
    <View style={styles.compare} accessible accessibilityLabel={label}>
      <Animated.View style={[styles.bar, { backgroundColor: track }, prevStyle]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, nowStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  highlight: { gap: space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: { flexBasis: "47%", flexGrow: 1 },
  body: { gap: space.xs, paddingVertical: space.md },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: { width: 28, height: 28, borderRadius: radius.md - 2, alignItems: "center", justifyContent: "center" },
  iconSolid: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0 },
  bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.xs, minHeight: 24 },
  change: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  periods: { gap: space.sm, marginTop: space.xs },
  zeroRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  zeroHint: { marginTop: space.xs },
  more: { flex: 1, justifyContent: "space-between" },
  moreFoot: { flexDirection: "row", alignItems: "center", gap: space.xs },
  period: { gap: 4 },
  periodText: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  compare: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 24 },
  bar: { width: 6, borderRadius: 3 },
});
