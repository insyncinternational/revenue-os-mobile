import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AccountSettings } from "@/features/account/AccountSettings";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { openAgencyActivity, openAgencyBilling, openAgencyReports, openAgencyTeam } from "@/features/agency/navigate";
import { useAgencyInfo, useIsAgencyAdmin } from "@/features/agency/useAgency";
import { t } from "@/i18n";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { HeroCard } from "@/ui/HeroCard";
import { Activity, ArrowLeftRight, BarChart, CreditCard, ICON_STROKE, Pencil, Users, type IconComponent } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
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

  const rows: ({ key: string; title: string; subtitle?: string; icon: IconComponent; onPress: () => void } | false)[] = [
    { key: "team", title: t("agency.team.title"), subtitle: t("agency.team.hint"), icon: Users, onPress: openAgencyTeam },
    admin && { key: "billing", title: t("agency.billing.title"), subtitle: t("agency.billing.hint"), icon: CreditCard, onPress: openAgencyBilling },
    { key: "reports", title: t("agency.reports.title"), subtitle: t("agency.reports.hint"), icon: BarChart, onPress: () => openAgencyReports() },
    admin && { key: "activity", title: t("agency.activity.title"), subtitle: t("agency.activity.hint"), icon: Activity, onPress: openAgencyActivity },
    { key: "switch", title: t("workspace.title"), subtitle: t("agency.account.switchHint"), icon: ArrowLeftRight, onPress: () => router.push("/switcher") },
  ];
  const shown = rows.filter((r): r is Exclude<(typeof rows)[number], false> => r !== false);

  return (
    <>
      <Screen contentInsetAdjustmentBehavior="never" onScroll={scrim.onScroll} scrollEventThrottle={32}>
        <AgencyHeader area="account" title={t("tabs.more")} hideProfile>
          <HeroCard onPress={() => router.push("/profile")} accessibilityLabel={[user?.name, user?.email, t("profile.edit")].filter(Boolean).join(". ")}>
            <View style={styles.profileTop}>
              <View style={[styles.avatarRing, { borderColor: colors.heroGlassBorder }]}>
                <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={60} />
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
              <View style={[styles.editIcon, { backgroundColor: colors.heroGlass }]}>
                <Pencil size={15} color={colors.onHero} strokeWidth={ICON_STROKE + 0.5} />
              </View>
            </View>
            {info ? (
              <View style={styles.badges}>
                {[role, agencyName].map((label) => (
                  <View key={label} style={[styles.badge, { backgroundColor: colors.heroGlass }]}>
                    <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.onHero }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </HeroCard>
        </AgencyHeader>

        <SectionHeader title={t("agency.account.agency")} />
        <Card padded={false} style={styles.card}>
          {shown.map((r, i) => {
            const Icon = r.icon;
            return (
              <View key={r.key}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={r.title}
                  subtitle={r.subtitle}
                  chevron
                  onPress={r.onPress}
                  leading={
                    <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                      <Icon size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                    </View>
                  }
                />
              </View>
            );
          })}
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
  editIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  badges: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", marginTop: space.xs },
  badge: { height: 26, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center", maxWidth: 220 },
  card: { marginHorizontal: gutter },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  hint: { paddingHorizontal: gutter + space.xs, paddingTop: space.sm },
});
