import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { count, relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { ClientRow } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { CheckCircle2, ICON_STROKE } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Divider } from "@/ui/Section";
import { Text } from "@/ui/Text";
import { clientHealth, clientName, type HealthReason } from "./agency";
import { openAgencyClient } from "./navigate";

/** The one-line reason under a client's health (also on the Clients list cards). */
export function reasonText(reason: HealthReason, c: ClientRow, locale: string): string {
  switch (reason) {
    case "invite":
      return t("agency.health.invite");
    case "lowCredits":
      return t("agency.health.lowCredits", { count: count(c.credits_balance, locale) });
    case "neverSignedIn":
      return t("agency.health.never");
    case "quiet":
      return t("agency.health.quiet", { when: c.last_active_at ? relativeTime(c.last_active_at, locale) : "" });
    case "noCampaigns":
      return t("agency.health.noCampaigns");
    default:
      return t("agency.health.ok");
  }
}

/** Every client sorted into healthy / at risk / not started (the web's Client health), then the ones who need you. */
export function HealthCard({ clients }: { clients: ClientRow[] }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const [now] = useState(() => Date.now());
  const h = clientHealth(clients, now);
  const total = h.healthy + h.risk + h.waiting;
  if (total === 0) return null;
  const parts = [
    { key: "healthy", n: h.healthy, color: colors.success, label: t("agency.health.healthy") },
    { key: "risk", n: h.risk, color: colors.danger, label: t("agency.health.risk") },
    { key: "waiting", n: h.waiting, color: colors.warning, label: t("agency.health.waiting") },
  ];
  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.bar, { backgroundColor: colors.surfaceTertiary }]} accessible accessibilityLabel={parts.map((p) => `${p.label}: ${p.n}`).join(", ")}>
          {parts.map((p) => (p.n > 0 ? <View key={p.key} style={{ flex: p.n, backgroundColor: p.color }} /> : null))}
        </View>
        <View style={styles.legend}>
          {parts.map((p) => (
            <View key={p.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text variant="footnote" tone="muted" numeric>
                {p.label} {p.n}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {h.needs.length === 0 ? (
        <View style={styles.clear}>
          <CheckCircle2 size={16} color={colors.success} strokeWidth={ICON_STROKE + 0.25} />
          <Text variant="footnote" tone="muted" style={styles.flex}>
            {t("agency.health.allClear")}
          </Text>
        </View>
      ) : (
        h.needs.slice(0, 4).map((r) => (
          <View key={r.client.id}>
            <Divider inset={gutter + 36 + space.md} />
            <ListRow
              title={clientName(r.client)}
              subtitle={reasonText(r.reason, r.client, locale)}
              leading={<Avatar name={clientName(r.client)} size={36} />}
              trailing={<Badge label={t(r.state === "risk" ? "agency.health.risk" : "agency.health.waiting")} tone={r.state === "risk" ? "danger" : "warning"} />}
              onPress={() => openAgencyClient(r.client.id)}
            />
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter },
  top: { padding: space.lg, gap: space.md },
  bar: { flexDirection: "row", height: 10, borderRadius: radius.pill, overflow: "hidden", gap: 2 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  clear: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.lg },
  flex: { flex: 1 },
});
