import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { money } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Deal, Stage } from "@/types/pipeline";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { daysInStage, isRotting } from "./pipeline";

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

function contactName(d: Deal): string | null {
  const l = d.lead;
  const name = l ? [l.first_name, l.last_name].filter(Boolean).join(" ").trim() : "";
  return [name || null, d.account?.name ?? l?.company ?? null].filter(Boolean).join(" · ") || null;
}

/** One deal: what, who, how much — plus what needs attention (close date passed, stalled in stage). */
export const DealCard = memo(function DealCard({ deal, stage, locale, now, showMoney, onPress, fallbackCurrency }: Props) {
  const currency = deal.currency ?? fallbackCurrency;
  const { colors } = useTheme();
  const who = contactName(deal);
  const days = daysInStage(deal, now);
  const stalled = isRotting(deal, stage, now);
  const close = deal.expected_close_date ? Date.parse(deal.expected_close_date) : NaN;
  const overdue = deal.status === "open" && Number.isFinite(close) && close < now - 86_400_000;
  const closeLabel = Number.isFinite(close) ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(close)) : null;

  return (
    <Card
      elevated
      onPress={() => onPress(deal)}
      accessibilityLabel={[deal.name, who, showMoney && deal.amount != null ? money(deal.amount, currency, locale) : null].filter(Boolean).join(". ")}
      style={styles.card}
      contentStyle={styles.body}
    >
      {/* The stage's own colour on the edge, like a tag on a card. */}
      <View style={[styles.edge, { backgroundColor: stage?.color ?? colors.primary }]} />
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={2}>
            {deal.name}
          </Text>
          {who ? (
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {who}
            </Text>
          ) : null}
        </View>
        {showMoney && deal.amount != null ? (
          <Text variant="headline" numeric>
            {money(deal.amount, currency, locale, { compact: deal.amount >= 100_000 })}
          </Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        {overdue ? <Badge label={t("pipeline.overdue")} tone="danger" /> : closeLabel ? <Badge label={t("pipeline.closes", { date: closeLabel })} /> : null}
        {stalled ? <Badge label={t("pipeline.stalled")} tone="warning" /> : days != null && deal.status === "open" ? <Badge label={t("pipeline.daysInStage", { days })} /> : null}
        <View style={styles.flex} />
        {deal.owner ? <Avatar name={deal.owner.name || deal.owner.email} size={24} /> : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, marginBottom: space.sm },
  body: { padding: space.lg, paddingLeft: space.lg + 4, gap: space.md },
  edge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  top: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
});
