import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { LANGUAGES, setLanguage, t, useLanguage, type AppLanguage, type TranslationKey } from "@/i18n";
import { initials } from "@/lib/format";
import { confirm } from "@/lib/confirm";
import { biometricKind, confirmOwner, useAppLock, type BiometricKind } from "@/session/appLock";
import { useSession } from "@/session/sessionStore";
import { useMeetingsSummary } from "@/features/calendar/useMeetings";
import { useInvoiceSummary } from "@/features/invoices/useInvoices";
import { useMyTaskCount } from "@/features/tasks/useTasks";
import { useApprovalCount, useDraftsVisible } from "@/features/approvals/useApprovals";
import { campaignStatus } from "@/features/campaigns/campaign";
import { useCampaigns, useCampaignsVisible } from "@/features/campaigns/useCampaigns";
import { openApprovals, openCalendar, openCampaigns, openInvoices, openTasks } from "@/lib/navigate";
import { useCan, useModuleEnabled, useWorkspaceAccess } from "@/session/workspace";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Badge, CountBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import {
  ArrowLeftRight,
  Bell,
  BellRing,
  CalendarDays,
  Fingerprint,
  ICON_STROKE,
  LayoutGrid,
  ListChecks,
  LogOut,
  Pencil,
  Receipt,
  ScanFace,
  Send,
  ShieldCheck,
} from "@/ui/icons";
import { Divider, SectionHeader } from "@/ui/Section";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Text } from "@/ui/Text";
import { Avatar } from "@/ui/Avatar";
import { PressableScale } from "@/ui/PressableScale";
import { TabHeader } from "@/ui/TabHeader";
import { useHeaderChip } from "@/ui/headerChip";
import { useUnreadNotifications } from "@/ui/HeroTopBar";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";

export default function More() {
  const { colors, preference, setPreference } = useTheme();
  const scrim = useStatusBarScrim();
  const chip = useHeaderChip();
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const access = useWorkspaceAccess().data;
  const language = useLanguage((s) => s.language);
  const meetingsOn = useModuleEnabled("meetings");
  const canMeetings = useCan("meetings_read");
  const crmOn = useModuleEnabled("crm");
  const canTasks = useCan("contacts_read");
  const showCalendar = meetingsOn && canMeetings;
  const showTasks = crmOn && canTasks;
  const showInvoices = useCan("invoices_read");
  const toRecord = useMeetingsSummary(showCalendar).data?.needs_outcome ?? 0;
  // Counts, not lists: this screen only shows the numbers.
  const myTasks = useMyTaskCount(showTasks);
  const unread = useUnreadNotifications();
  const overdueInvoices = useInvoiceSummary(showInvoices).data?.overdue ?? 0;
  const approvals = useApprovalCount();
  const showCampaigns = useCampaignsVisible();
  const liveCampaigns = (useCampaigns(showCampaigns).data ?? []).filter((c) => !c.archived_at && campaignStatus(c) === "running").length;
  const lockOn = useAppLock((s) => s.enabled);
  const [lockKind, setLockKind] = useState<BiometricKind | null>(null);
  useEffect(() => {
    void biometricKind().then(setLockKind);
  }, []);
  // Turning it on asks once, so nobody locks themselves out with biometrics that don't work.
  const toggleLock = async (on: boolean) => {
    if (on && !(await confirmOwner(t("lock.confirmPrompt"), t("common.cancel")))) return;
    useAppLock.getState().setEnabled(on);
  };
  // Shown where the AI SDR is on, or whenever an agent has something waiting.
  const showApprovals = useDraftsVisible() || approvals > 0;

  const workspaceName = access?.workspace.name ?? "…";
  const clientName = access?.client?.name && access.client.name !== workspaceName ? access.client.name : null;

  return (
    <>
      <Screen contentInsetAdjustmentBehavior="never" onScroll={scrim.onScroll} scrollEventThrottle={32}>
        {/* Who is signed in lives in the header now (the avatar); no separate profile card. */}
        <TabHeader
          title={user?.name || t("tabs.more")}
          summary={user?.email}
          hideProfile
          leading={<ProfileAvatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} />}
          titleAccessory={
            <PressableScale
              onPress={() => router.push("/profile")}
              accessibilityRole="button"
              accessibilityLabel={t("profile.edit")}
              hitSlop={8}
              style={[styles.editIcon, chip]}
            >
              <Pencil size={15} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} />
            </PressableScale>
          }
        >
          {access ? (
            <View style={styles.badges}>
              <View style={[styles.badge, chip]}>
                <Text variant="caption" weight="semibold" style={{ color: colors.textSecondary }}>
                  {roleLabel(access.role)}
                </Text>
              </View>
              <View style={[styles.badge, chip]}>
                <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.textSecondary }}>
                  {access.client?.name ?? access.workspace.name}
                </Text>
              </View>
            </View>
          ) : null}
        </TabHeader>

        <SectionHeader title={t("more.work")} />
        <Card padded={false} style={styles.card}>
          <ListRow
            title={t("more.notifications")}
            chevron
            onPress={() => router.push("/notifications")}
            leading={
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                <Bell size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
              </View>
            }
            trailing={unread ? <CountBadge count={unread} /> : undefined}
          />
          {showApprovals ? (
            <>
              <Divider inset={64} />
              <ListRow
                title={t("approvals.title")}
                subtitle={approvals ? t("approvals.waiting", { count: approvals }) : null}
                chevron
                onPress={openApprovals}
                leading={
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                    <ShieldCheck size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                  </View>
                }
                trailing={approvals ? <CountBadge count={approvals} /> : undefined}
              />
            </>
          ) : null}
          {showCalendar || showTasks || showInvoices || showCampaigns ? <Divider inset={64} /> : null}
          {showCalendar ? (
            <ListRow
              title={t("more.calendar")}
              subtitle={toRecord ? `${t("meeting.toRecord")} · ${toRecord}` : null}
              chevron
              onPress={openCalendar}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <CalendarDays size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                </View>
              }
              trailing={toRecord ? <CountBadge count={toRecord} /> : undefined}
            />
          ) : null}
          {showCalendar && showTasks ? <Divider inset={64} /> : null}
          {showTasks ? (
            <ListRow
              title={t("more.tasks")}
              chevron
              onPress={openTasks}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <ListChecks size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                </View>
              }
              trailing={myTasks ? <Badge label={String(myTasks)} tone="neutral" /> : undefined}
            />
          ) : null}
          {showInvoices && (showCalendar || showTasks) ? <Divider inset={64} /> : null}
          {showInvoices ? (
            <ListRow
              title={t("more.invoices")}
              subtitle={overdueInvoices ? t("invoice.overdueCount", { count: overdueInvoices }) : null}
              chevron
              onPress={openInvoices}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <Receipt size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                </View>
              }
              trailing={overdueInvoices ? <CountBadge count={overdueInvoices} /> : undefined}
            />
          ) : null}
          {showCampaigns && (showCalendar || showTasks || showInvoices) ? <Divider inset={64} /> : null}
          {showCampaigns ? (
            <ListRow
              title={t("campaigns.title")}
              subtitle={liveCampaigns ? t("campaigns.liveCount", { count: liveCampaigns }) : null}
              chevron
              onPress={openCampaigns}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <Send size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                </View>
              }
            />
          ) : null}
        </Card>

        <SectionHeader title={t("more.workspace")} />
        <Card padded={false} style={styles.card}>
          <ListRow
            title={clientName ?? workspaceName}
            subtitle={clientName ? workspaceName : access?.source === "agency" ? t("workspace.viaAgency") : null}
            chevron
            onPress={() => router.push("/switcher")}
            accessibilityHint={t("workspace.title")}
            leading={
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                <ArrowLeftRight size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
              </View>
            }
            trailing={access?.source === "agency" ? <Badge label={t("workspace.clients")} tone="brand" /> : undefined}
          />
        </Card>

        <SectionHeader title={t("more.settings")} />
        <Card padded={false} style={styles.card}>
          <ListRow
            title={t("more.notificationSettings")}
            chevron
            onPress={() => router.push("/notification-settings")}
            leading={
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                <BellRing size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
              </View>
            }
          />
        </Card>

        {lockKind ? (
          <>
            <SectionHeader title={t("more.security")} />
            <Card padded={false} style={styles.card}>
              <ListRow
                title={lockKind === "face" ? t("lock.settingFace") : t("lock.setting")}
                subtitle={t("lock.settingHint")}
                leading={
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                    {lockKind === "face" ? (
                      <ScanFace size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                    ) : (
                      <Fingerprint size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                    )}
                  </View>
                }
                trailing={
                  <Switch
                    value={lockOn}
                    onValueChange={(on) => void toggleLock(on)}
                    accessibilityLabel={lockKind === "face" ? t("lock.settingFace") : t("lock.setting")}
                    trackColor={{
                      true: colors.primaryFill,
                      false: colors.borderStrong,
                    }}
                    ios_backgroundColor={colors.surfaceTertiary}
                  />
                }
              />
            </Card>
          </>
        ) : null}

        <SectionHeader title={t("more.appearance")} />
        <View style={styles.block}>
          <SegmentedControl<ThemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { key: "system", label: t("appearance.system") },
              { key: "light", label: t("appearance.light") },
              { key: "dark", label: t("appearance.dark") },
            ]}
          />
        </View>

        <SectionHeader title={t("more.language")} />
        <View style={styles.block}>
          <SegmentedControl<AppLanguage>
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((l) => ({
              key: l.code,
              label: l.nativeName,
            }))}
          />
        </View>

        {__DEV__ ? (
          <>
            <SectionHeader title={t("more.developer")} />
            <Card padded={false} style={styles.card}>
              <ListRow
                title={t("more.gallery")}
                chevron
                onPress={() => router.push("/gallery")}
                leading={
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                    <LayoutGrid size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                  </View>
                }
              />
            </Card>
          </>
        ) : null}

        <View style={[styles.block, styles.signOut]}>
          <Button
            label={t("more.signOut")}
            icon={LogOut}
            variant="danger"
            fullWidth
            onPress={async () => {
              if (await confirm(t("more.signOutConfirm"), t("more.signOut"), t("common.cancel"), true)) await signOut();
            }}
          />
          <Text variant="footnote" tone="subtle" align="center">
            {t("more.version", {
              version: Constants.expoConfig?.version ?? "",
            })}
          </Text>
        </View>
      </Screen>
      <StatusBarScrim shown={scrim.shown} />
    </>
  );
}

const ROLE_KEYS: Record<string, TranslationKey> = {
  owner: "role.owner",
  admin: "role.admin",
  member: "role.member",
  manager: "role.manager",
  viewer: "role.viewer",
  agency_admin: "role.agency_admin",
  agency_user: "role.agency_user",
};

/** "owner" → "Owner" (in the app language); an unknown "sales_rep" → "Sales rep". */
function roleLabel(role: string): string {
  const key = ROLE_KEYS[role];
  if (key) return t(key);
  const r = role.replace(/_/g, " ");
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/** The profile picture in the header: the photo, else large initials on a brand tint (like the bar's initials above). */
function ProfileAvatar({ name, uri }: { name: string; uri?: string | null }) {
  const { colors } = useTheme();
  if (uri) return <Avatar name={name} uri={uri} size={68} />;
  return (
    <View
      style={[
        styles.profileAvatar,
        {
          backgroundColor: colors.primarySubtle,
          borderColor: colors.primaryBorder,
        },
      ]}
    >
      <Text variant="title" style={{ color: colors.primaryText }} maxFontSizeMultiplier={1}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  /** The pen after the name: opens Edit profile (28 px, 44 px to tap with hitSlop). */
  editIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    height: 26,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    maxWidth: 220,
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { marginHorizontal: gutter },
  block: { paddingHorizontal: gutter },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  signOut: { marginTop: space.xxxl, gap: space.md },
});
