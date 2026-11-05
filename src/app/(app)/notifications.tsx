import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { categoryOf, groupByDay, type FeedItem } from "@/features/notifications/group";
import { useMarkAllRead, useMarkRead, useNotificationFeed, type NotifFilter } from "@/features/notifications/useNotifications";
import { getIntlLocale, t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { appLinkFor } from "@/lib/links";
import { go, openApproval, openConversation, openMeeting } from "@/lib/navigate";
import { approvalIdOf, conversationIdOf, meetingIdOf } from "@/push/routing";
import { useOnline } from "@/query/useOnline";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import type { NotificationRow } from "@/types/notifications";
import { FilterChips } from "@/ui/Chip";
import { BellOff, Building, Calendar, CheckCheck, CircleAlert, ICON_STROKE, KanbanSquare, Link, MessageCircle, Receipt, ShieldCheck, Sparkles, Users, type IconComponent } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { PressableScale } from "@/ui/PressableScale";
import { PullRefresh } from "@/ui/PullRefresh";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

const CATEGORY: Record<string, { icon: IconComponent; bg: keyof Palette; fg: keyof Palette }> = {
  inbox: { icon: MessageCircle, bg: "primarySubtle", fg: "primary" },
  assignment: { icon: Users, bg: "primarySubtle", fg: "primary" },
  meeting: { icon: Calendar, bg: "primarySubtle", fg: "primary" },
  crm: { icon: KanbanSquare, bg: "primarySubtle", fg: "primary" },
  lead: { icon: Users, bg: "primarySubtle", fg: "primary" },
  ai_sdr: { icon: Sparkles, bg: "primarySubtle", fg: "primary" },
  ai_studio: { icon: Sparkles, bg: "primarySubtle", fg: "primary" },
  team: { icon: Building, bg: "surfaceTertiary", fg: "textSecondary" },
  // Your account (sign-in, password, email verified): not a warning, just news about you.
  account: { icon: ShieldCheck, bg: "primarySubtle", fg: "primary" },
  integration: { icon: Link, bg: "primarySubtle", fg: "primary" },
  billing: { icon: Receipt, bg: "primarySubtle", fg: "primary" },
  system: { icon: CircleAlert, bg: "surfaceTertiary", fg: "textSecondary" },
};

export default function Notifications() {
  const headerTint = useAreaHeaderStyle("account");
  const { colors } = useTheme();
  const online = useOnline();
  const [filter, setFilter] = useState<NotifFilter>("all");
  const feed = useNotificationFeed(filter);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const locale = getIntlLocale();

  const rows = useMemo(() => feed.data?.pages.flatMap((p) => p.notifications) ?? [], [feed.data]);
  const items = useMemo(() => groupByDay(rows), [rows]);
  const unread = feed.data?.pages[0]?.unread_count ?? 0;

  const open = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate(n.id);
    // The list covers every workspace; open a row in its own workspace (as a push tap does), not the
    // active one, or a conversation / meeting from another workspace shows "Not found".
    const session = useSession.getState();
    if (n.base_id && n.base_id !== session.activeBaseId) session.setActiveBase(n.base_id);
    const conversation = conversationIdOf(n.metadata);
    if (conversation) return openConversation(conversation);
    const meeting = meetingIdOf(n.metadata);
    if (meeting) return openMeeting(meeting);
    const approval = approvalIdOf(n.metadata);
    if (approval) return openApproval(approval);
    const link = appLinkFor(n.metadata?.action_url);
    if (link) go(link);
  };

  const dayLabel = (item: Extract<FeedItem, { type: "header" }>) =>
    item.day === "today" ? t("notif.today") : item.day === "yesterday" ? t("notif.yesterday") : new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(item.date));

  return (
    <>
      <Stack.Screen
        options={{ headerStyle: headerTint,
          headerRight: () =>
            unread > 0 ? (
              <IconButton
                icon={CheckCheck}
                label={t("notif.markAllRead")}
                circle
                size={20}
                onPress={() => {
                  haptics.success();
                  markAll.mutate();
                }}
              />
            ) : null,
        }}
      />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={items}
          keyExtractor={(i) => i.key}
          getItemType={(i) => i.type}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<PullRefresh busy={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Backdrop area="account" underBar />
              <FilterChips<NotifFilter>
                value={filter}
                onChange={setFilter}
                options={[
                  { key: "all", label: t("notif.all") },
                  { key: "unread", label: t("notif.unread"), count: unread },
                  { key: "inbox", label: t("notif.replies") },
                  { key: "assignment", label: t("notif.assigned") },
                  { key: "meeting", label: t("notif.meetings") },
                  { key: "crm", label: t("notif.crm") },
                ]}
              />
            </View>
          }
          ListEmptyComponent={
            feed.isPending ? (
              <DelayedFallback>
                <SkeletonList rows={7} />
              </DelayedFallback>
            ) : feed.isError ? (
              <ErrorState offline={!online} message={online ? userMessage(feed.error) : undefined} onRetry={() => void feed.refetch()} />
            ) : (
              <EmptyState area="account" icon={BellOff} title={t("notif.emptyTitle")} message={filter === "unread" ? t("notif.emptyUnread") : t("notif.emptyMessage")} />
            )
          }
          ListFooterComponent={feed.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text variant="eyebrow" tone="muted" style={styles.day} accessibilityRole="header">
                {dayLabel(item)}
              </Text>
            ) : (
              <NotificationItem row={item.row} locale={locale} onPress={open} />
            )
          }
        />
      </View>
    </>
  );
}

function NotificationItem({ row, locale, onPress }: { row: NotificationRow; locale: string; onPress: (n: NotificationRow) => void }) {
  const { colors } = useTheme();
  const c = CATEGORY[categoryOf(row)] ?? CATEGORY.system!;
  const Icon = c.icon;
  const unread = !row.read_at;
  return (
    <PressableScale
      onPress={() => onPress(row)}
      scaleTo={0.985}
      accessibilityLabel={[unread ? t("state.unread") : null, row.title, row.message].filter(Boolean).join(". ")}
      // Unread rows on a soft brand tint (with the dot); read ones sit flat on the page.
      style={[styles.item, { backgroundColor: unread ? colors.primarySubtle : "transparent", borderColor: "transparent" }]}
    >
      <View style={[styles.icon, { backgroundColor: colors[c.bg] }]}>
        <Icon size={18} color={colors[c.fg]} strokeWidth={ICON_STROKE + 0.25} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="callout" weight={unread ? "semibold" : "medium"} numberOfLines={2} style={styles.title}>
            {row.title}
          </Text>
          <Text variant="caption" tone={unread ? "primary" : "subtle"} numeric>
            {relativeTime(row.created_at, locale)}
          </Text>
        </View>
        {row.message ? (
          <Text variant="subhead" tone="muted" numberOfLines={2}>
            {row.message}
          </Text>
        ) : null}
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : <View style={styles.dotSpace} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  filters: { paddingTop: space.xs, paddingBottom: space.sm },
  day: { paddingHorizontal: gutter + space.xs, paddingTop: space.lg, paddingBottom: space.sm },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.md, marginHorizontal: space.sm, marginBottom: space.xs, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  title: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotSpace: { width: 8 },
  footer: { height: space.huge },
});
