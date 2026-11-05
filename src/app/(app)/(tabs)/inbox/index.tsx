import { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { CardCell } from "@/ui/CardCell";
import { showDialog } from "@/ui/Dialog";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { InboxRow } from "@/features/inbox/InboxRow";
import { NeedsReply } from "@/features/inbox/NeedsReply";
import { groupByDay, type InboxGroup, type InboxListEntry } from "@/features/inbox/list";
import { AiReviewCard } from "@/features/approvals/AiReviewCard";
import { useInboxAction, useInboxList } from "@/features/inbox/useInbox";
import { getIntlLocale, t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { openConversation } from "@/lib/navigate";
import { useDebounced } from "@/lib/useDebounced";
import { useOnline } from "@/query/useOnline";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { InboxChannel, InboxFilter, InboxItem } from "@/types/inbox";
import { channelLabel } from "@/ui/ChannelIcon";
import { FilterChips, type FilterOption } from "@/ui/Chip";
import { Archive, Inbox as InboxIcon, Lock, Mail, MailOpen, Search } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { SearchBar } from "@/ui/SearchBar";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { ListReveal } from "@/ui/ListReveal";
import { SwipeableRow } from "@/ui/SwipeableRow";
import { useToast } from "@/ui/Toast";
import { TabHeader } from "@/ui/TabHeader";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";

type View_ = InboxFilter["view"] | "archived";
const CHANNELS: InboxChannel[] = ["email", "whatsapp", "sms", "website_chat", "linkedin", "instagram", "facebook"];

export default function InboxScreen() {
  const enabled = useModuleEnabled("inbox");
  if (!enabled) {
    return <EmptyState area="inbox" icon={Lock} title={t("state.notAllowedTitle")} message={t("inbox.notAvailable")} />;
  }
  return <InboxList />;
}

function InboxList() {
  const { colors } = useTheme();
  const scrim = useStatusBarScrim();
  const toast = useToast();
  const online = useOnline();
  const locale = getIntlLocale();
  const canManage = useCan("inbox_manage");
  const [view, setView] = useState<View_>("all");
  const [channel, setChannel] = useState<"all" | InboxChannel>("all");
  const [search, setSearch] = useState("");
  // Search sits behind the header's search button (as in the mock); it stays open while there's a query.
  const [searching, setSearching] = useState(false);
  const [now] = useState(() => new Date());
  const debounced = useDebounced(search, 300);

  const filter = useMemo<InboxFilter>(
    () => ({ view: view === "archived" ? "all" : view, status: view === "archived" ? "archived" : "open", channel, search: debounced }),
    [view, channel, debounced]
  );
  const list = useInboxList(filter);
  const rows = useMemo(() => groupByDay(list.items, now), [list.items, now]);
  const act = useInboxAction();

  const open = useCallback((item: InboxItem) => {
    openConversation(item.id);
  }, []);
  const reply = useCallback((item: InboxItem) => {
    openConversation(item.id, { reply: true });
  }, []);

  const archive = useCallback(
    (item: InboxItem) => {
      act.mutate({ id: item.id, action: "archive" });
      toast.show(t("inbox.archivedToast"), { action: { label: t("today.undo"), onPress: () => act.mutate({ id: item.id, action: "unarchive" }) } });
    },
    [act, toast]
  );

  const menu = useCallback(
    (item: InboxItem) => {
      if (!canManage || Platform.OS === "web") return;
      haptics.selection();
      showDialog({
        title: item.contact_label || item.contact_email || "",
        actions: [
          { label: t("inbox.assignMe"), onPress: () => act.mutate({ id: item.id, action: "assignMe", assignees: item.assignee_user_ids ?? [] }, { onSuccess: () => toast.show(t("inbox.assignedToast"), { kind: "success" }) }) },
          { label: t("inbox.snoozeTomorrow"), onPress: () => act.mutate({ id: item.id, action: "snoozeTomorrow" }, { onSuccess: () => toast.show(t("inbox.snoozedToast")) }) },
          { label: t("common.cancel"), style: "cancel" },
        ],
      });
    },
    [act, canManage, toast]
  );

  const counts = list.counts;
  const viewOptions: FilterOption<View_>[] = [
    { key: "all", label: t("inbox.all") },
    { key: "unread", label: t("inbox.unread"), count: counts?.all },
    { key: "mine", label: t("inbox.mine"), count: list.assignment?.mine },
    { key: "unassigned", label: t("inbox.unassigned"), count: list.assignment?.unassigned },
    { key: "archived", label: t("inbox.archived") },
  ];
  // Channel chips only for channels with conversations (plus the one selected), so the row stays short.
  const channelOptions: FilterOption<"all" | InboxChannel>[] = [
    { key: "all", label: t("inbox.allChannels") },
    ...CHANNELS.filter((c) => c === channel || (counts?.[c] ?? 0) > 0 || list.items.some((i) => i.channel === c)).map((c) => ({ key: c, label: channelLabel[c] })),
  ];

  const empty = list.isPending ? (
    <DelayedFallback>
      <SkeletonList rows={8} />
    </DelayedFallback>
  ) : list.isError ? (
    <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
  ) : (
    <EmptyState area="inbox"
      icon={InboxIcon}
      title={debounced || view !== "all" || channel !== "all" ? t("inbox.emptyFilter") : t("inbox.emptyTitle")}
      message={debounced ? t("inbox.emptySearch") : view === "all" && channel === "all" ? t("inbox.emptyMessage") : undefined}
    />
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={rows}
        keyExtractor={(r) => r.key}
        getItemType={(r) => r.kind}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onRefresh={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <TabHeader
              area="inbox"
              title={t("tabs.inbox")}
              summary={inboxSummary(counts?.all ?? 0, list.assignment?.unassigned ?? 0)}
              extra={{ label: t("inbox.search"), icon: Search, active: searching || !!search, onPress: () => (search ? setSearch("") : setSearching((v) => !v)) }}
            />
            {searching || search ? (
              <View style={styles.pad}>
                <SearchBar value={search} onChangeText={setSearch} placeholder={t("inbox.search")} autoFocus />
              </View>
            ) : null}
            <FilterChips value={view} onChange={setView} options={viewOptions} />
            {view === "all" && !debounced ? <AiReviewCard /> : null}
            {channelOptions.length > 2 ? (
              <FilterChips value={channel} onChange={setChannel} options={channelOptions} />
            ) : null}
            {/* Who is waiting on a reply, one tap each (only while viewing everything, so it never repeats a filter).
                Below the chips, so the filters stay put when it appears or goes. */}
            {view === "all" && !debounced ? <NeedsReply items={list.items} onOpen={open} /> : null}
          </View>
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
        renderItem={({ item: entry, index }) => {
          if (entry.kind === "header") return <GroupLabel group={entry.group} />;
          const item = entry.item;
          const row = canManage ? (
            <SwipeableRow
              id={item.id}
              left={{
                label: item.unread_count > 0 ? t("inbox.read") : t("inbox.markUnread"),
                icon: item.unread_count > 0 ? MailOpen : Mail,
                color: colors.primaryFill,
                onTrigger: () => act.mutate({ id: item.id, action: item.unread_count > 0 ? "read" : "unread" }),
                // In the Unread view, reading it takes it off the list.
                removes: view === "unread" && item.unread_count > 0,
              }}
              right={view === "archived" ? undefined : { label: t("inbox.archive"), icon: Archive, color: colors.textMuted, onTrigger: () => archive(item), removes: true }}
            >
              {/* Inside the swipe row (never around it), so the swipe area isn't moved while it slides in. */}
              <ListReveal index={index}>
                <InboxRow item={item} locale={locale} onPress={open} onLongPress={menu} onReply={reply} />
              </ListReveal>
            </SwipeableRow>
          ) : (
            <ListReveal index={index}>
              <InboxRow item={item} locale={locale} onPress={open} onReply={reply} />
            </ListReveal>
          );
          return <GroupRow entry={entry}>{row}</GroupRow>;
        }}
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

/** "2 unread · 3 conversations need an owner", or "All caught up". */
function inboxSummary(unread: number, unassigned: number): string {
  const parts: string[] = [];
  if (unread) parts.push(t("inbox.summaryUnread", { count: unread }));
  if (unassigned) parts.push(unassigned === 1 ? t("inbox.summaryUnassignedOne") : t("inbox.summaryUnassigned", { count: unassigned }));
  return parts.length ? parts.join(" · ") : t("inbox.summaryClear");
}

const GROUP_LABEL: Record<InboxGroup, "inbox.groupToday" | "inbox.groupWeek" | "inbox.groupEarlier"> = { today: "inbox.groupToday", week: "inbox.groupWeek", earlier: "inbox.groupEarlier" };

/** "THIS WEEK": a small spaced label above each group. */
function GroupLabel({ group }: { group: InboxGroup }) {
  return (
    <Text variant="eyebrow" tone="muted" style={styles.groupLabel} accessibilityRole="header">
      {t(GROUP_LABEL[group])}
    </Text>
  );
}

/** A row inside its group's white card: rounded at the group's ends, a hairline between rows. */
function GroupRow({ entry, children }: { entry: Extract<InboxListEntry<InboxItem>, { kind: "row" }>; children: React.ReactNode }) {
  return (
    <CardCell first={entry.first} last={entry.last} inset={space.md + 2 + 48 + space.md}>
      {children}
    </CardCell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: space.md, paddingBottom: space.sm },
  pad: { paddingHorizontal: gutter },
  footer: { height: space.huge * 2 },
  groupLabel: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.sm + 2 },
});
