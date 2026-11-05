import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { count, money, relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { ClientRow } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { ChevronRight, ICON_STROKE } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { AGENCY_CURRENCY, clientName, clientState, healthOf, type HealthState } from "./agency";
import { reasonText } from "./HealthCard";
import { openAgencyClient } from "./navigate";

const HEALTH: Record<HealthState, { label: "agency.health.healthy" | "agency.health.risk" | "agency.health.waiting"; tone: BadgeTone }> = {
  healthy: { label: "agency.health.healthy", tone: "success" },
  risk: { label: "agency.health.risk", tone: "danger" },
  waiting: { label: "agency.health.waiting", tone: "warning" },
};

const STATE = {
  trash: { label: "agency.state.trash", tone: "danger" },
  paused: { label: "agency.state.paused", tone: "warning" },
  suspended: { label: "agency.state.suspended", tone: "danger" },
  invited: { label: "agency.state.invited", tone: "info" },
} as const;

/**
 * One client on the Clients tab, as a card: who it is, how it's doing (the same health as Home, with its reason),
 * and its three numbers (leads, open deals, credits). Paused, suspended, invited and Trash show their state instead.
 */
export const ClientCard = memo(function ClientCard({ client, now }: { client: ClientRow; now: number }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const name = clientName(client);
  const state = clientState(client);
  const health = healthOf(client, now);
  const chip = state === "active" ? HEALTH[health.state] : STATE[state];
  const why = state === "active" ? reasonText(health.reason, client, locale) : state === "invited" ? t("agency.health.invite") : null;
  const seen = client.last_active_at ? t("agency.client.seen", { when: relativeTime(client.last_active_at, locale) }) : null;
  const stats = [
    { label: t("agency.stat.leads"), value: count(client.leads, locale) },
    { label: t("agency.stat.openDeals"), value: count(client.deals_open, locale) },
    { label: t("agency.stat.won"), value: money(client.deals_won_value, AGENCY_CURRENCY, locale, { compact: client.deals_won_value >= 10_000 }) },
    { label: t("agency.client.credits"), value: count(client.credits_balance, locale) },
  ];
  const open = () => {
    haptics.selection();
    openAgencyClient(client.id);
  };
  if (state === "invited") {
    return (
      <PressableScale
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={[name, t(chip.label), why, t("agency.client.creditsCount", { count: count(client.credits_balance, locale) })].filter(Boolean).join(", ")}
        scaleTo={0.985}
        style={[styles.card, styles.row, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
      >
        <Avatar name={name} size={44} />
        <View style={styles.who}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={2}>
            {[why, t("agency.client.creditsCount", { count: count(client.credits_balance, locale) })].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Badge label={t(chip.label)} tone={chip.tone} />
      </PressableScale>
    );
  }
  return (
    <PressableScale
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={[name, t(chip.label), why, ...stats.map((s) => `${s.label} ${s.value}`), seen].filter(Boolean).join(", ")}
      scaleTo={0.985}
      style={[styles.card, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
    >
      <View style={styles.top}>
        <Avatar name={name} size={44} />
        <View style={styles.who}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={1} ellipsizeMode="middle">
            {client.email}
          </Text>
        </View>
        <Badge label={t(chip.label)} tone={chip.tone} dot />
      </View>

      <View style={[styles.stats, { backgroundColor: colors.surfaceSecondary }]}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
            <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.foot}>
        <Text variant="footnote" tone="secondary" numberOfLines={1} style={styles.flex}>
          {why ?? ""}
        </Text>
        {seen ? (
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {seen}
          </Text>
        ) : null}
        <ChevronRight size={16} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, padding: space.lg, gap: space.md, borderRadius: radius.xl + 4 },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  who: { flex: 1, minWidth: 0, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  stats: { flexDirection: "row", borderRadius: radius.md - 2, paddingVertical: space.sm + 2 },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: space.xs },
  foot: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
});
