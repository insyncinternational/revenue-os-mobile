import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { money, timeOfDay } from "@/lib/format";
import { go, openDeal, openMeeting } from "@/lib/navigate";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { KpiMetric, MeetingRow, PipelineOverview } from "@/types/home";
import type { PipelineInsights } from "./pipelineInsights";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { CalendarDays, ChevronRight, Clock, ICON_STROKE, Trophy } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/** A meeting counts as "now" from 15 minutes before it starts until an hour after. */
const NOW_BEFORE = 15 * 60_000;
const NOW_AFTER = 60 * 60_000;

type Props = { pipeline: PipelineOverview | null; won: KpiMetric | null; sinceDays: number; currency: string; meetings: MeetingRow[]; insights?: PipelineInsights };

/**
 * The pipeline at a glance, as ONE card (the agency home's pool card is the model): the open amount and what it is
 * likely worth, a thin bar of its stages, the deal to close next and any deals that stopped moving, then a row
 * with what was won in the period and the next meeting. Rows join the same card, so the page keeps its shape.
 */
export function Glance({ pipeline, won, sinceDays, currency, meetings, insights }: Props) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const [now] = useState(() => Date.now());
  const next = pickMeeting(meetings, now);
  const deals = pipeline?.bars.reduce((n, b) => n + b.count, 0) ?? 0;
  const total = pipeline?.total_value ?? 0;
  const valued = (pipeline?.bars ?? []).filter((b) => b.value > 0);
  const fmt = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n));
  if (!pipeline && !won && !next) return null;
  const code = pipeline?.currency ?? currency;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}>
      <PressableScale
        onPress={() => go("/pipeline")}
        accessibilityRole="button"
        accessibilityLabel={`${t("pipeline.openValue")}: ${money(total, code, locale)}, ${deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}`}
        scaleTo={0.99}
        style={styles.top}
      >
        <View style={styles.between}>
          <Text variant="footnote" tone="muted">
            {t("pipeline.openValue")}
          </Text>
          <View style={styles.inline}>
            <Text variant="footnote" tone="muted">
              {deals === 1 ? t("today.openDealsOne") : t("today.openDeals", { count: deals })}
            </Text>
            <ChevronRight size={15} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
          </View>
        </View>
        <View style={styles.amount}>
          <Text variant="headline" tone="muted" weight="medium">{`${code} `}</Text>
          <AnimatedNumber value={total} format={fmt} variant="display" numberOfLines={1} adjustsFontSizeToFit style={styles.big} />
        </View>
        {/* What the open deals are likely worth, each weighted by its stage's chance to close. */}
        {insights && insights.expected > 0 && total > 0 ? (
          <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
            {t("today.expectedValue", { value: money(insights.expected, code, locale) })}
          </Text>
        ) : null}
        {total > 0 ? (
          <>
            {/* One thin bar: each stage its share, the first in the brand colour and the next ones lighter. */}
            <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {valued.map((b, i) => (
                <View key={b.stage_id} style={[styles.segment, { flexGrow: Math.max(b.value / total, 0.04), backgroundColor: colors.primaryFill, opacity: Math.max(1 - i * 0.22, 0.35) }]} />
              ))}
            </View>
            <View style={styles.legend}>
              {valued.map((b, i) => (
                <View key={b.stage_id} style={styles.inline}>
                  <View style={[styles.dot, { backgroundColor: colors.primaryFill, opacity: Math.max(1 - i * 0.22, 0.35) }]} />
                  <Text variant="caption" tone="secondary" numeric numberOfLines={1}>
                    {`${b.label} ${fmt(b.value)}`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </PressableScale>

      {insights?.next ? <NextDeal next={insights.next} currency={code} /> : null}
      {insights?.stalled ? (
        <PressableScale onPress={() => go("/pipeline")} accessibilityRole="button" scaleTo={0.99} style={[styles.row, styles.stalled, { borderTopColor: colors.border }]}>
          <Clock size={16} color={colors.textMuted} strokeWidth={ICON_STROKE} />
          <Text variant="footnote" tone="secondary" numberOfLines={1} style={styles.flex}>
            {insights.stalled.count === 1 ? t("today.stalledOne", { days: insights.stalled.days }) : t("today.stalledMany", { count: insights.stalled.count })}
          </Text>
          <ChevronRight size={15} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
        </PressableScale>
      ) : null}

      {won || next ? (
        <View style={[styles.foot, { borderTopColor: colors.border }]}>
          {won ? (
            <View style={styles.cell}>
              <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
                <Trophy size={16} color={colors.text} strokeWidth={ICON_STROKE + 0.25} />
              </View>
              <View style={styles.cellText}>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {t("today.wonDays", { days: sinceDays })}
                </Text>
                <Text variant="headline" numeric numberOfLines={1}>
                  {won.kind === "currency" ? money(won.value, currency, locale) : fmt(won.value)}
                </Text>
              </View>
            </View>
          ) : null}
          {won && next ? <View style={[styles.split, { backgroundColor: colors.border }]} /> : null}
          {next ? <MeetingCell meeting={next} now={now} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** The open deal most likely to bring money in next: its name, who it's with and stage, amount and chance; opens it. */
function NextDeal({ next, currency }: { next: NonNullable<PipelineInsights["next"]>; currency: string }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const { deal, chance } = next;
  const person = [deal.lead?.first_name, deal.lead?.last_name].filter(Boolean).join(" ");
  const sub = [person || deal.account?.name || deal.lead?.company, deal.stage?.name].filter(Boolean).join(" · ");
  const amount = deal.amount != null ? money(deal.amount, deal.currency ?? currency, locale) : null;
  return (
    <PressableScale
      onPress={() => openDeal(deal.id)}
      accessibilityRole="button"
      accessibilityLabel={[t("today.nextToClose"), deal.name, sub, amount, chance != null ? `${chance}%` : null].filter(Boolean).join(", ")}
      scaleTo={0.99}
      style={[styles.row, styles.nextDeal, { borderTopColor: colors.border }]}
    >
      <View style={styles.flex}>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t("today.nextToClose")}
        </Text>
        <Text variant="callout" weight="semibold" numberOfLines={1}>
          {deal.name}
        </Text>
        {sub ? (
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={styles.end}>
        {amount ? (
          <Text variant="callout" weight="semibold" numeric numberOfLines={1}>
            {amount}
          </Text>
        ) : null}
        {chance != null ? (
          <View style={[styles.chance, { backgroundColor: colors.surfaceSecondary }]}>
            <Text variant="caption" weight="medium" numeric tone="secondary">
              {t("pipeline.likelyPct", { n: chance })}
            </Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={15} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
    </PressableScale>
  );
}

/** The next meeting in the card's bottom row: when (Now, Next, Tomorrow, Fri) and what time; opens it. */
function MeetingCell({ meeting, now }: { meeting: MeetingRow; now: number }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const start = Date.parse(meeting.due_at!);
  const live = start - NOW_BEFORE <= now && now <= start + NOW_AFTER;
  const label = meetingLabel(start, now, live, locale);
  return (
    <PressableScale
      onPress={() => openMeeting(meeting.task_id)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${timeOfDay(meeting.due_at!, locale)}, ${meeting.title}`}
      scaleTo={0.97}
      style={styles.cell}
    >
      <View style={[styles.icon, { backgroundColor: live ? colors.primarySubtle : colors.surfaceSecondary }]}>
        <CalendarDays size={16} color={live ? colors.primary : colors.text} strokeWidth={ICON_STROKE + 0.25} />
      </View>
      <View style={styles.cellText}>
        <Text variant="caption" numberOfLines={1} style={{ color: live ? colors.primaryText : colors.textMuted }}>
          {label}
        </Text>
        <Text variant="headline" numeric numberOfLines={1}>
          {timeOfDay(meeting.due_at!, locale)}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * The meeting for the card: the one on now or next today; else the next one coming up (tomorrow, later this
 * week); else the latest one from earlier today.
 */
function pickMeeting(meetings: MeetingRow[], now: number): MeetingRow | undefined {
  const start = new Date(now).setHours(0, 0, 0, 0);
  const end = start + 86_400_000;
  const live = meetings.filter((m) => m.due_at && m.status !== "cancelled").sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  const today = live.filter((m) => Date.parse(m.due_at!) >= start && Date.parse(m.due_at!) < end);
  return today.find((m) => Date.parse(m.due_at!) + NOW_AFTER >= now) ?? live.find((m) => Date.parse(m.due_at!) >= end) ?? today[today.length - 1];
}

/** "Now", "Next", "Earlier today"; for another day "Tomorrow" or the weekday ("Fri"). */
function meetingLabel(start: number, now: number, live: boolean, locale: string): string {
  if (live) return t("today.nowLabel");
  const dayStart = new Date(now).setHours(0, 0, 0, 0);
  if (start >= dayStart + 86_400_000) {
    if (start < dayStart + 2 * 86_400_000) return t("when.tomorrow");
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(start));
  }
  return start > now ? t("today.nextLabel") : t("today.earlierLabel");
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl + 4, overflow: "hidden" },
  top: { padding: space.lg, paddingBottom: space.md, gap: space.sm },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inline: { flexDirection: "row", alignItems: "center", gap: space.xs },
  amount: { flexDirection: "row", alignItems: "baseline" },
  big: { flexShrink: 1 },
  bar: { flexDirection: "row", gap: 3, height: 10, marginTop: space.xs },
  segment: { borderRadius: 5 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  foot: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: space.md, paddingHorizontal: space.lg },
  cell: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm + 2, minWidth: 0 },
  cellText: { flex: 1, minWidth: 0, gap: 1 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm + 2, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg },
  nextDeal: { paddingVertical: space.md },
  stalled: { paddingVertical: space.sm + 4 },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  end: { alignItems: "flex-end", gap: 4 },
  chance: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  split: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginHorizontal: space.md },
});
