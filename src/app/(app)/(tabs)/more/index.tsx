import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AccountSettings } from "@/features/account/AccountSettings";
import { useMyAgencies } from "@/features/agency/useAgency";
import { backToAgency } from "@/features/agency/openClient";
import { t, type TranslationKey } from "@/i18n";
import { pickAgency } from "@/features/agency/agency";
import { useAppMode } from "@/session/mode";
import { useSession } from "@/session/sessionStore";
import { useMeetingsSummary } from "@/features/calendar/useMeetings";
import { useInvoiceSummary } from "@/features/invoices/useInvoices";
import { useMyTaskCount } from "@/features/tasks/useTasks";
import { useApprovalCount, useDraftsVisible } from "@/features/approvals/useApprovals";
import { campaignStatus } from "@/features/campaigns/campaign";
import { useCampaigns, useCampaignsVisible } from "@/features/campaigns/useCampaigns";
import { openApprovals, openCalendar, openCampaigns, openInvoices, openTasks } from "@/lib/navigate";
import { useCan, useModuleEnabled, useWorkspaceAccess } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Badge, CountBadge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import {
  ArrowLeftRight,
  Building,
  Bell,
  CalendarDays,
  ICON_STROKE,
  ListChecks,
  Pencil,
  Receipt,
  Send,
  ShieldCheck,
  type IconComponent,
} from "@/ui/icons";
import { Divider, SectionHeader } from "@/ui/Section";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Avatar } from "@/ui/Avatar";
import { HeroCard } from "@/ui/HeroCard";
import { PressableScale } from "@/ui/PressableScale";
import { TabHeader } from "@/ui/TabHeader";
import { useUnreadNotifications } from "@/ui/HeroTopBar";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";

export default function More() {
  const { colors } = useTheme();
  const scrim = useStatusBarScrim();
  const user = useSession((s) => s.user);
  const access = useWorkspaceAccess().data;
  const agencies = useMyAgencies().data?.agencies ?? [];
  const agencyId = pickAgency(useAppMode((s) => s.agencyId), agencies);
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
  // Shown where the AI SDR is on, or whenever an agent has something waiting.
  const showApprovals = useDraftsVisible() || approvals > 0;

  const workspaceName = access?.workspace.name ?? "…";
  const clientName = access?.client?.name && access.client.name !== workspaceName ? access.client.name : null;

  return (
    <>
      <Screen contentInsetAdjustmentBehavior="never" onScroll={scrim.onScroll} scrollEventThrottle={32}>
        {/* Who is signed in, as the screen's one hero card: the whole card opens Edit profile. */}
        <TabHeader area="account" title={t("tabs.more")} hideProfile>
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
            {access ? (
              <View style={styles.badges}>
                {[roleLabel(access.role), access.client?.name ?? access.workspace.name].map((label) => (
                  <View key={label} style={[styles.badge, { backgroundColor: colors.heroGlass }]}>
                    <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.onHero }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </HeroCard>
        </TabHeader>

        <SectionHeader title={t("more.work")} />
        {/* Your work as calm tiles (approvals in the accent), with what's waiting on it. */}
        <View style={styles.grid}>
          {(
            [
              { id: "notif", label: t("more.notifications"), icon: Bell, fg: colors.primary, bg: colors.primarySubtle, count: unread, onPress: () => router.push("/notifications") },
              showApprovals && { id: "approvals", label: t("approvals.title"), icon: ShieldCheck, fg: colors.primary, bg: colors.primarySubtle, count: approvals, onPress: openApprovals },
              showCalendar && { id: "calendar", label: t("more.calendar"), icon: CalendarDays, fg: colors.primary, bg: colors.primarySubtle, count: toRecord, onPress: openCalendar },
              showTasks && { id: "tasks", label: t("more.tasks"), icon: ListChecks, fg: colors.primary, bg: colors.primarySubtle, count: myTasks, onPress: openTasks },
              showInvoices && { id: "invoices", label: t("more.invoices"), icon: Receipt, fg: colors.primary, bg: colors.primarySubtle, count: overdueInvoices, onPress: openInvoices },
              showCampaigns && { id: "campaigns", label: t("campaigns.title"), icon: Send, fg: colors.primary, bg: colors.primarySubtle, count: liveCampaigns, onPress: openCampaigns },
            ] as (WorkTileProps | false)[]
          )
            .filter((x): x is WorkTileProps => x !== false)
            .map((x) => (
              <WorkTile key={x.id} {...x} />
            ))}
        </View>

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
          {agencyId ? <Divider inset={gutter + 36 + space.md} /> : null}
          {agencyId ? (
            <ListRow
              title={t("agency.backToAgency")}
              subtitle={agencies.find((a) => a.id === agencyId)?.name}
              chevron
              onPress={() => backToAgency(agencyId)}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySubtle }]}>
                  <Building size={18} color={colors.primary} strokeWidth={ICON_STROKE} />
                </View>
              }
            />
          ) : null}
        </Card>

        <AccountSettings />
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

type WorkTileProps = { id: string; label: string; icon: IconComponent; fg: string; bg: string; count?: number; onPress: () => void };

/** One of "Your work": a white tile with its icon on a tint of its own colour, and a badge when something waits. */
function WorkTile({ label, icon: Icon, fg, bg, count, onPress }: WorkTileProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      scaleTo={0.96}
      style={[styles.tile, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: bg }]}>
          <Icon size={20} color={fg} strokeWidth={ICON_STROKE + 0.25} />
        </View>
        {count ? <CountBadge count={count} /> : null}
      </View>
      <Text variant="callout" weight="semibold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  profileTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  // A soft white ring, so the photo or initials stand off the gradient behind them.
  avatarRing: { borderRadius: 34, borderWidth: 2, padding: 2 },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  /** A hint that the card edits the profile (the card itself is the button). */
  editIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  badges: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", marginTop: space.xs },
  badge: { height: 26, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center", maxWidth: 220 },
  card: { marginHorizontal: gutter },
  block: { paddingHorizontal: gutter },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm + 2, paddingHorizontal: gutter },
  tile: { width: "31.5%", flexGrow: 1, borderRadius: radius.xl, padding: space.md + 2, gap: space.md },
  tileTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tileIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
