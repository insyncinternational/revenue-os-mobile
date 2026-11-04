import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { userMessage } from "@/api/errors";
import { AGENCY_CURRENCY, reportMetrics, topClients } from "@/features/agency/agency";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { BillingNotice } from "@/features/agency/BillingNotice";
import { ClientRowItem } from "@/features/agency/ClientRowItem";
import { HealthCard } from "@/features/agency/HealthCard";
import { openAgencyClient, openAgencyReports, openBuyCredits, openInviteClient, openMoveCredits, openNewClient } from "@/features/agency/navigate";
import { useAgencyCan, useAgencyDashboard, useAgencyInfo, useAgencyReports, type Days } from "@/features/agency/useAgency";
import { Kpis } from "@/features/today/Kpis";
import { QuickActions } from "@/features/today/QuickActions";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { count, money } from "@/lib/format";
import { greetingKey } from "@/lib/greeting";
import { useOnline } from "@/query/useOnline";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { BarChart, Link, Sparkles, UserPlus } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { Text } from "@/ui/Text";

/** Agency home: how the clients are doing, what needs the agency, the credit pool and the period's results. */
export default function AgencyHome() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const scrim = useStatusBarScrim();
  const user = useSession((s) => s.user);
  const [days, setDays] = useState<Days>(30);
  const info = useAgencyInfo();
  const dashboard = useAgencyDashboard();
  const reports = useAgencyReports(days);
  const canCreate = useAgencyCan("create_clients");
  const canCredits = useAgencyCan("manage_credits");
  const canBuy = useAgencyCan("manage_billing");

  const refresh = () => {
    void info.refetch();
    void dashboard.refetch();
    void reports.refetch();
  };

  const firstName = user?.name?.split(" ")[0];
  const greeting = `${t(greetingKey(new Date().getHours()))}${firstName ? `, ${firstName}` : ""}`;
  const totals = dashboard.data?.totals;
  const summary = totals ? t("agency.home.summary", { clients: count(totals.clients, locale), credits: count(totals.lead_credits, locale) }) : null;

  const quick: { key: string; label: TranslationKey; icon: typeof UserPlus; onPress: () => void }[] = [];
  if (canCreate) quick.push({ key: "contact", label: "agency.quick.addClient", icon: UserPlus, onPress: openNewClient });
  if (canCreate) quick.push({ key: "deal", label: "agency.quick.invite", icon: Link, onPress: openInviteClient });
  if (canCredits) quick.push({ key: "task", label: "agency.quick.giveCredits", icon: Sparkles, onPress: () => openMoveCredits() });
  quick.push({ key: "meeting", label: "agency.quick.reports", icon: BarChart, onPress: () => openAgencyReports() });

  const header = <AgencyHeader title={greeting} greeting={{ hello: t(greetingKey(new Date().getHours())), name: firstName || undefined }} summary={summary} area="today" />;

  if (!dashboard.data && dashboard.isPending) {
    return (
      <Screen contentInsetAdjustmentBehavior="never">
        {header}
        <DelayedFallback>
          <SkeletonList rows={6} />
        </DelayedFallback>
      </Screen>
    );
  }
  if (!dashboard.data) {
    return (
      <Screen contentInsetAdjustmentBehavior="never" onRefresh={refresh} refreshing={dashboard.isRefetching}>
        {header}
        <ErrorState offline={!online} message={online ? userMessage(dashboard.error) : undefined} onRetry={refresh} />
      </Screen>
    );
  }

  const clients = dashboard.data.clients;
  const recent = [...clients].filter((c) => !c.in_trash).sort((a, b) => Date.parse(b.last_active_at ?? "0") - Date.parse(a.last_active_at ?? "0")).slice(0, 5);
  const metrics = reports.data ? reportMetrics(reports.data, (k) => t(k as TranslationKey)) : [];
  const top = reports.data ? topClients(reports.data) : [];
  let section = 0;

  return (
    <View style={styles.fill}>
      <Screen contentInsetAdjustmentBehavior="never" onRefresh={refresh} refreshing={dashboard.isRefetching || reports.isRefetching} onScroll={scrim.onScroll} scrollEventThrottle={16}>
        {header}
        {!online ? <OfflineBanner /> : null}

        <View style={styles.block}>
          <Reveal index={section++}>
            <BillingNotice />
          </Reveal>
          <Reveal index={section++}>
            <QuickActions actions={quick} />
          </Reveal>
        </View>

        {/* The pool every client's credits come from. */}
        <Reveal index={section++}>
          <SectionHeader title={t("agency.home.pool")} />
          {/* The agency's hero: the credit pool on the glossy accent card. */}
          <View style={[styles.card, styles.poolCard, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}>
            <Sheen />
            <View style={styles.flex}>
              <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.onPrimary }}>
                {count(totals?.lead_credits ?? 0, locale)}
              </Text>
              <Text variant="footnote" style={{ color: colors.onPrimaryMuted }}>
                {t("agency.home.poolLabel")}
              </Text>
            </View>
            <View style={styles.poolActions}>
              {canBuy ? <Button label={t("agency.credits.buy")} size="sm" onPress={openBuyCredits} /> : null}
              {canCredits ? <Button label={t("agency.credits.give")} size="sm" variant="secondary" onPress={() => openMoveCredits()} /> : null}
            </View>
          </View>
        </Reveal>

        <Reveal index={section++}>
          <SectionHeader title={t("agency.home.health")} action={t("common.seeAll")} onAction={() => router.navigate("/agency/clients")} />
          <HealthCard clients={clients} />
        </Reveal>

        <Reveal index={section++}>
          <SectionHeader
            title={t("agency.home.results")}
            right={
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
            }
          />
          <View style={styles.block}>
            {metrics.length ? <Kpis metrics={metrics} currency={AGENCY_CURRENCY} /> : reports.isError ? <ErrorState message={userMessage(reports.error)} onRetry={() => void reports.refetch()} /> : <SkeletonList rows={2} />}
          </View>
        </Reveal>

        {top.length > 0 ? (
          <Reveal index={section++}>
            <SectionHeader title={t("agency.home.top")} action={t("common.seeAll")} onAction={() => openAgencyReports()} />
            <Card padded={false} style={styles.card}>
              {top.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                  <ListRow
                    title={c.name}
                    subtitle={[t("agency.top.replies", { count: count(c.replies, locale) }), c.won_value > 0 ? t("agency.top.won", { amount: money(c.won_value, AGENCY_CURRENCY, locale, { compact: true }) }) : null].filter(Boolean).join(" · ")}
                    leading={<Avatar name={c.name} size={36} />}
                    chevron
                    onPress={() => openAgencyClient(c.id)}
                  />
                </View>
              ))}
            </Card>
          </Reveal>
        ) : null}

        {recent.length > 0 ? (
          <Reveal index={section++}>
            <SectionHeader title={t("agency.home.recent")} action={t("common.seeAll")} onAction={() => router.navigate("/agency/clients")} />
            <Card padded={false} style={styles.card}>
              {recent.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <Divider inset={gutter + 40 + space.md} /> : null}
                  <ClientRowItem client={c} />
                </View>
              ))}
            </Card>
          </Reveal>
        ) : (
          <Reveal index={section++}>
            <Card style={styles.card} contentStyle={styles.empty}>
              <Text variant="headline">{t("agency.home.noClientsTitle")}</Text>
              <Text variant="subhead" tone="muted">
                {t("agency.home.noClientsMessage")}
              </Text>
              {canCreate ? <Button label={t("agency.quick.addClient")} icon={UserPlus} onPress={openNewClient} style={styles.emptyButton} /> : null}
            </Card>
          </Reveal>
        )}
        <View style={{ height: space.xxl, backgroundColor: colors.background }} />
      </Screen>
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  block: { paddingHorizontal: gutter, gap: space.md },
  card: { marginHorizontal: gutter },
  poolCard: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.xxl, padding: space.xl, overflow: "hidden" },
  poolActions: { gap: space.sm, alignItems: "flex-end" },
  flex: { flex: 1, minWidth: 0 },
  empty: { gap: space.sm, alignItems: "flex-start" },
  emptyButton: { marginTop: space.sm },
});
