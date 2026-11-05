import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AccountSettings } from "@/features/account/AccountSettings";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { openAgencyActivity, openAgencyBilling, openAgencyReports, openAgencyTeam } from "@/features/agency/navigate";
import { AGENCY_CURRENCY } from "@/features/agency/agency";
import { useAgencyBilling, useAgencyInfo, useAgencyReports, useAgencyTeam, useIsAgencyAdmin } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { money } from "@/lib/format";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { HeroCard } from "@/ui/HeroCard";
import { PressableScale } from "@/ui/PressableScale";
import { Activity, ArrowLeftRight, BarChart, CreditCard, ICON_STROKE, Users, type IconComponent } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/Section";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { Text } from "@/ui/Text";

/** The agency Account tab: who is signed in, the agency's team, billing, reports and activity, then the app settings. */
export default function AgencyAccount() {
  const { colors } = useTheme();
  const scrim = useStatusBarScrim();
  const user = useSession((s) => s.user);
  const info = useAgencyInfo().data;
  const admin = useIsAgencyAdmin();
  const agencyName = info?.agency.brand_name || info?.agency.name || "";
  const role = info?.role === "agency_admin" || info?.role === "platform_admin" ? t("role.agency_admin") : t("role.agency_user");

  const locale = getIntlLocale();
  // Live details for the tiles (each is cached and shared with its own screen).
  const team = useAgencyTeam().data;
  const billing = useAgencyBilling(admin).data?.billing;
  const won = useAgencyReports(30).data?.totals.won_value;
  const renew = billing?.billing_period_end ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(billing.billing_period_end)) : null;

  const tiles: ({ key: string; title: string; detail: string; icon: IconComponent; onPress: () => void; people?: string[] } | false)[] = [
    { key: "team", title: t("agency.team.title"), detail: t("agency.team.hint"), icon: Users, onPress: openAgencyTeam, people: team?.members.map((m) => m.name || m.email || "?") },
    admin && { key: "billing", title: t("agency.billing.title"), detail: billing ? [billing.plan_name, renew ? t("agency.billing.renews", { date: renew }) : null].filter(Boolean).join(" · ") : t("agency.billing.hint"), icon: CreditCard, onPress: openAgencyBilling },
    { key: "reports", title: t("agency.reports.title"), detail: won != null && won > 0 ? t("agency.top.won", { amount: money(won, AGENCY_CURRENCY, locale, { compact: won >= 100_000 }) }) : t("agency.reports.hint"), icon: BarChart, onPress: () => openAgencyReports() },
    admin && { key: "activity", title: t("agency.activity.title"), detail: t("agency.activity.hint"), icon: Activity, onPress: openAgencyActivity },
  ];
  const shown = tiles.filter((r): r is Exclude<(typeof tiles)[number], false> => r !== false);

  return (
    <>
      <Screen contentInsetAdjustmentBehavior="never" onScroll={scrim.onScroll} scrollEventThrottle={32}>
        <AgencyHeader area="account" title={t("tabs.more")} hideProfile>
          <HeroCard onPress={() => router.push("/profile")} accessibilityLabel={[user?.name, user?.email, t("profile.edit")].filter(Boolean).join(". ")}>
            <View style={styles.profileTop}>
              <View style={[styles.avatarRing, { borderColor: colors.heroGlassBorder }]}>
                <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={60} onHero />
              </View>
              <View style={styles.profileText}>
                <Text variant="title" numberOfLines={1} style={{ color: colors.onHero }}>
                  {user?.name || user?.email || ""}
                </Text>
                {user?.name && user.email ? (
                  <Text variant="subhead" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.edit, { backgroundColor: colors.surface }]}>
                <Text variant="footnote" weight="semibold">
                  {t("common.edit")}
                </Text>
              </View>
            </View>
            {info ? (
              <View style={[styles.badge, { backgroundColor: colors.heroGlass }]}>
                <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.onHero }}>
                  {[role, agencyName].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
          </HeroCard>
        </AgencyHeader>

        <SectionHeader title={t("agency.account.agency")} />
        <View style={styles.grid}>
          {shown.map((r) => {
            const Icon = r.icon;
            return (
              <PressableScale
                key={r.key}
                onPress={r.onPress}
                accessibilityRole="button"
                accessibilityLabel={`${r.title}. ${r.detail}`}
                scaleTo={0.97}
                style={[styles.tile, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
              >
                <View style={styles.tileTop}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    <Icon size={18} color={colors.text} strokeWidth={ICON_STROKE + 0.25} />
                  </View>
                  {r.people && r.people.length > 0 ? (
                    <View style={styles.people}>
                      {r.people.slice(0, 3).map((n, i) => (
                        <View key={`${n}-${i}`} style={[styles.person, i > 0 && styles.personOverlap, { borderColor: colors.surface }]}>
                          <Avatar name={n} size={26} />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.tileText}>
                  <Text variant="headline" numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text variant="footnote" tone="muted" numberOfLines={2}>
                    {r.detail}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
        <Card padded={false} style={[styles.card, styles.switch]}>
          <ListRow
            title={t("workspace.title")}
            subtitle={t("agency.account.switchHint")}
            subtitleLines={2}
            chevron
            onPress={() => router.push("/switcher")}
            leading={
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <ArrowLeftRight size={18} color={colors.text} strokeWidth={ICON_STROKE + 0.25} />
              </View>
            }
          />
        </Card>
        <Text variant="footnote" tone="muted" style={styles.hint}>
          {t("agency.account.webHint")}
        </Text>

        <AccountSettings />
      </Screen>
      <StatusBarScrim shown={scrim.shown} />
    </>
  );
}

const styles = StyleSheet.create({
  profileTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatarRing: { borderRadius: 34, borderWidth: 2, padding: 2 },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  edit: { height: 32, paddingHorizontal: space.md + 2, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  badge: { alignSelf: "flex-start", height: 26, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center", maxWidth: "100%", marginTop: space.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm + 2, paddingHorizontal: gutter },
  tile: { flexBasis: "47%", flexGrow: 1, padding: space.lg, gap: space.md, borderRadius: radius.xl },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileText: { gap: 2 },
  people: { flexDirection: "row" },
  person: { borderWidth: 2, borderRadius: 15 },
  personOverlap: { marginLeft: -8 },
  switch: { marginTop: space.sm + 2 },
  card: { marginHorizontal: gutter },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  hint: { paddingHorizontal: gutter + space.xs, paddingTop: space.sm },
});
