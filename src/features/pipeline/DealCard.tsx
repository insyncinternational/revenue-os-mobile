import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { money } from "@/lib/format";
import { gutter, space } from "@/theme/tokens";
import type { Deal, Stage } from "@/types/pipeline";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { ScoreBar } from "@/ui/Meters";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { daysInStage, isRotting, stageAgeTone } from "./pipeline";

type Props = {
  deal: Deal;
  stage?: Stage;
  locale: string;
  now: number;
  showMoney: boolean;
  onPress: (d: Deal) => void;
  /** The workspace's default currency, for a deal saved without one (never a made-up USD). */
  fallbackCurrency: string;
};

function personName(d: Deal): string {
  const l = d.lead;
  return l ? [l.first_name, l.last_name].filter(Boolean).join(" ").trim() : "";
}

function contactName(d: Deal): string | null {
  return [personName(d) || null, d.account?.name ?? d.lead?.company ?? null].filter(Boolean).join(" · ") || null;
}

/** One deal: what, who, how much — plus what needs attention (close date passed, stalled in stage). */
export const DealCard = memo(function DealCard({ deal, stage, locale, now, showMoney, onPress, fallbackCurrency }: Props) {
  const currency = deal.currency ?? fallbackCurrency;
  const who = contactName(deal);
  const days = daysInStage(deal, now);
  const stalled = isRotting(deal, stage, now);
  const age = days != null && deal.status === "open" ? stageAgeTone(days) : null;
  const close = deal.expected_close_date ? Date.parse(deal.expected_close_date) : NaN;
  const overdue = deal.status === "open" && Number.isFinite(close) && close < now - 86_400_000;
  const closeLabel = Number.isFinite(close) ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(close)) : null;

  return (
    <Card
      onPress={() => onPress(deal)}
      accessibilityLabel={[deal.name, who, showMoney && deal.amount != null ? money(deal.amount, currency, locale) : null].filter(Boolean).join(". ")}
      style={styles.card}
      contentStyle={styles.body}
    >
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={2}>
            {deal.name}
          </Text>
          {who ? (
            // The person's face beside who it's with, so a deal is recognisable at a glance.
            <View style={styles.who}>
              {personName(deal) ? <Avatar name={personName(deal)} size={20} /> : null}
              <Text variant="subhead" tone="muted" numberOfLines={1} style={styles.whoText}>
                {who}
              </Text>
            </View>
          ) : null}
        </View>
        {showMoney && deal.amount != null ? (
          <Text variant="title" numeric style={styles.amount}>
            {money(deal.amount, currency, locale, { compact: deal.amount >= 100_000 })}
          </Text>
        ) : null}
      </View>
      {/* How likely it is to close, as a health-coloured bar (open deals only). */}
      {deal.status === "open" && deal.probability != null ? <ScoreBar value={deal.probability} label={t("pipeline.probability")} /> : null}
      <View style={styles.meta}>
        {overdue ? <Badge label={t("pipeline.overdue")} tone="danger" /> : closeLabel ? <Badge label={t("pipeline.closes", { date: closeLabel })} /> : null}
        {/* Time in this stage: "New" on day one, then the days, amber after two weeks and red after a month. */}
        {stalled ? (
          <Badge label={t("pipeline.stalled")} tone="warning" dot />
        ) : age === "new" ? (
          <Badge label={t("pipeline.newInStage")} tone="brand" />
        ) : age ? (
          <Badge label={t("pipeline.daysInStage", { days: days ?? 0 })} tone={age} dot={age !== "neutral"} />
        ) : null}
        <View style={styles.flex} />
        {deal.owner ? <Avatar name={deal.owner.name || deal.owner.email} size={24} /> : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, marginBottom: space.sm + 2 },
  body: { padding: space.lg + 2, gap: space.md },
  amount: { fontSize: 20, lineHeight: 26 },
  top: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  who: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, marginTop: 2 },
  whoText: { flexShrink: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
});
