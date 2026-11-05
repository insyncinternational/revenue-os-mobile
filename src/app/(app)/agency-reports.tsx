import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { AGENCY_CURRENCY, reportMetrics } from "@/features/agency/agency";
import { openAgencyClient } from "@/features/agency/navigate";
import { useAgencyReports, useAgencyUsage, type Days } from "@/features/agency/useAgency";
import { Kpis } from "@/features/today/Kpis";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { count, money } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { SkeletonList } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

type Tab = "results" | "usage";

/** Results across clients (leads, messages, replies, meetings, wins) and credit use per client, for 7 / 30 / 90 days. */
export default function AgencyReportsScreen() {
  const online = useOnline();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === "usage" ? "usage" : "results");
  const [days, setDays] = useState<Days>(30);
  return (
    <>
      <Stack.Screen options={{ title: t("agency.reports.title") }} />
      <Screen>
        {!online ? <OfflineBanner /> : null}
        <View style={styles.controls}>
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: "results", label: t("agency.reports.results") },
              { key: "usage", label: t("agency.reports.usage") },
            ]}
          />
          <SegmentedControl<`${Days}`>
            size="sm"
            value={`${days}`}
            onChange={(v) => setDays(Number(v) as Days)}
            options={[
              { key: "7", label: t("today.last7") },
              { key: "30", label: t("today.last30") },
              { key: "90", label: t("today.last90") },
            ]}
          />
        </View>
        {tab === "results" ? <Results days={days} onUsage={() => setTab("usage")} /> : <Usage days={days} />}
      </Screen>
    </>
  );
}

function Results({ days, onUsage }: { days: Days; onUsage: () => void }) {
  const locale = getIntlLocale();
  const report = useAgencyReports(days);
  if (!report.data) return report.isError ? <ErrorState message={userMessage(report.error)} onRetry={() => void report.refetch()} /> : <SkeletonList rows={6} />;
  const metrics = reportMetrics(report.data, (k) => t(k as TranslationKey));
  const clients = [...report.data.clients].sort((a, b) => b.replies - a.replies || b.won_value - a.won_value);
  const rate = report.data.totals.reply_rate_pct;
  return (
    <>
      <View style={styles.pad}>
        <Kpis metrics={metrics} currency={AGENCY_CURRENCY} more={{ label: t("agency.reports.usage"), hint: t("agency.reports.title"), onPress: onUsage }} />
        {rate != null ? (
          <Text variant="footnote" tone="muted" style={styles.rate}>
            {t("agency.reports.replyRate", { rate: Math.round(rate) })}
          </Text>
        ) : null}
      </View>
      <SectionHeader title={t("agency.reports.byClient")} count={clients.length} />
      <Card padded={false} style={styles.card}>
        {clients.length === 0 ? (
          <ListRow title={t("agency.reports.noClients")} />
        ) : (
          clients.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
              <ListRow
                title={c.name}
                subtitle={t("agency.reports.clientLine", { leads: count(c.leads, locale), sent: count(c.sent, locale), replies: count(c.replies, locale), meetings: count(c.meetings, locale) })}
                subtitleLines={2}
                leading={<Avatar name={c.name} size={36} />}
                trailing={c.won_value > 0 ? <Text variant="callout" weight="semibold" numeric>{money(c.won_value, AGENCY_CURRENCY, locale, { compact: true })}</Text> : undefined}
                onPress={() => openAgencyClient(c.id)}
              />
            </View>
          ))
        )}
      </Card>
    </>
  );
}

function Usage({ days }: { days: Days }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const usage = useAgencyUsage(days);
  if (!usage.data) return usage.isError ? <ErrorState message={userMessage(usage.error)} onRetry={() => void usage.refetch()} /> : <SkeletonList rows={6} />;
  const u = usage.data;
  const top = Math.max(1, ...u.by_operation.map((o) => o.credits));
  return (
    <>
      <View style={[styles.pad, styles.stats]}>
        {[
          { label: t("agency.usage.spent"), value: count(u.totals.credits_spent, locale) },
          { label: t("agency.usage.given"), value: count(u.totals.credits_given, locale) },
          { label: t("agency.usage.active"), value: `${count(u.totals.clients_active, locale)}/${count(u.totals.clients, locale)}` },
        ].map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Text variant="metric" numeric numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
            <Text variant="footnote" tone="muted" numberOfLines={2}>
              {s.label}
            </Text>
          </Card>
        ))}
      </View>
      {u.by_operation.length > 0 ? (
        <>
          <SectionHeader title={t("agency.usage.onWhat")} />
          <Card style={styles.card} contentStyle={styles.ops}>
            {u.by_operation.slice(0, 6).map((o) => (
              <View key={o.operation} style={styles.op} accessible accessibilityLabel={`${o.label}: ${o.credits}`}>
                <View style={styles.opTop}>
                  <Text variant="subhead" numberOfLines={1} style={styles.flex}>
                    {o.label}
                  </Text>
                  <Text variant="subhead" weight="semibold" numeric>
                    {count(o.credits, locale)}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.surfaceTertiary }]}>
                  <View style={[styles.fillBar, { width: `${Math.max(3, (o.credits / top) * 100)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <SectionHeader title={t("agency.reports.byClient")} count={u.clients.length} />
      <Card padded={false} style={styles.card}>
        {u.clients.length === 0 ? (
          <ListRow title={t("agency.reports.noClients")} />
        ) : (
          [...u.clients]
            .sort((a, b) => b.credits_spent - a.credits_spent)
            .map((c, i) => {
              const name = c.business_name || c.name;
              return (
                <View key={c.id}>
                  {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                  <ListRow
                    title={name}
                    subtitle={t("agency.usage.clientLine", { spent: count(c.credits_spent, locale), left: count(c.credits_balance, locale) })}
                    leading={<Avatar name={name} size={36} />}
                    chevron
                    onPress={() => openAgencyClient(c.id)}
                  />
                </View>
              );
            })
        )}
      </Card>
      <View style={styles.footer} />
    </>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: gutter, paddingTop: space.sm, gap: space.md },
  pad: { paddingHorizontal: gutter, paddingTop: space.lg },
  rate: { marginTop: space.sm },
  card: { marginHorizontal: gutter },
  stats: { flexDirection: "row", gap: space.sm },
  stat: { flex: 1, minWidth: 0 },
  ops: { gap: space.md },
  op: { gap: space.xs + 2 },
  opTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  fillBar: { height: 8, borderRadius: radius.pill },
  footer: { height: space.huge },
});
