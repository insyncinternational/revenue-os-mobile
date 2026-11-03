import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { InboxRow } from "@/features/inbox/InboxRow";
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
import { Archive, Inbox as InboxIcon, Lock, Mail, MailOpen } from "@/ui/icons";
import { SearchBar } from "@/ui/SearchBar";
import { Divider } from "@/ui/Section";
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
    return <EmptyState icon={Lock} title={t("state.notAllowedTitle")} message={t("inbox.notAvailable")} />;
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
  const debounced = useDebounced(search, 300);

  const filter = useMemo<InboxFilter>(
    () => ({ view: view === "archived" ? "all" : view, status: view === "archived" ? "archived" : "open", channel, search: debounced }),
    [view, channel, debounced]
  );
  const list = useInboxList(filter);
  const act = useInboxAction();

  const open = useCallback((item: InboxItem) => {
    openConversation(item.id);
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
      Alert.alert(item.contact_label || item.contact_email || "", undefined, [
        { text: t("inbox.assignMe"), onPress: () => act.mutate({ id: item.id, action: "assignMe", assignees: item.assignee_user_ids ?? [] }, { onSuccess: () => toast.show(t("inbox.assignedToast"), { kind: "success" }) }) },
        { text: t("inbox.snoozeTomorrow"), onPress: () => act.mutate({ id: item.id, action: "snoozeTomorrow" }, { onSuccess: () => toast.show(t("inbox.snoozedToast")) }) },
        { text: t("common.cancel"), style: "cancel" },
      ]);
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
    <EmptyState
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
        data={list.items}
        keyExtractor={(i) => i.id}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onRefresh={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ItemSeparatorComponent={RowDivider}
        ListHeaderComponent={
          <View style={styles.header}>
            <TabHeader title={t("tabs.inbox")} summary={inboxSummary(counts?.all ?? 0, list.assignment?.unassigned ?? 0)} />
            <View style={styles.pad}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t("inbox.search")} />
            </View>
            <FilterChips value={view} onChange={setView} options={viewOptions} />
            {channelOptions.length > 2 ? (
              <FilterChips value={channel} onChange={setChannel} options={channelOptions} />
            ) : null}
          </View>
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
        renderItem={({ item, index }) =>
          canManage ? (
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
                <InboxRow item={item} locale={locale} onPress={open} onLongPress={menu} />
              </ListReveal>
            </SwipeableRow>
          ) : (
            <ListReveal index={index}>
              <InboxRow item={item} locale={locale} onPress={open} />
            </ListReveal>
          )
        }
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

/** Stable separator: an inline one was a new component type on every render, so every divider remounted. */
/** "2 unread · 3 unassigned", or "All caught up". */
function inboxSummary(unread: number, unassigned: number): string {
  const parts: string[] = [];
  if (unread) parts.push(t("inbox.summaryUnread", { count: unread }));
  if (unassigned) parts.push(t("inbox.summaryUnassigned", { count: unassigned }));
  return parts.length ? parts.join(" · ") : t("inbox.summaryClear");
}

function RowDivider() {
  return <Divider inset={gutter + 48 + space.md} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: space.md, paddingBottom: space.sm },
  pad: { paddingHorizontal: gutter },
  footer: { height: space.huge * 2 },
});
