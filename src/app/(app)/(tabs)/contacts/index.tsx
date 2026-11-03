import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import type { ContactFilter } from "@/api/contacts";
import { userMessage } from "@/api/errors";
import { ContactRow } from "@/features/contacts/ContactRow";
import { useContactList } from "@/features/contacts/useContacts";
import { getIntlLocale, t } from "@/i18n";
import { count } from "@/lib/format";
import { openContact, openContactForm } from "@/lib/navigate";
import { useDebounced } from "@/lib/useDebounced";
import { useOnline } from "@/query/useOnline";
import { useCan, useWorkspaceAccess } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { Contact } from "@/types/contact";
import { FilterChips } from "@/ui/Chip";
import { Fab } from "@/ui/Fab";
import { Lock, Users } from "@/ui/icons";
import { SearchBar } from "@/ui/SearchBar";
import { Divider } from "@/ui/Section";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { ListReveal } from "@/ui/ListReveal";
import { TabHeader } from "@/ui/TabHeader";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";

/**
 * Contacts are leads, which belong to no lockable module (backend services/users/moduleAccess.ts), so the list
 * is never hidden by a plan lock — only by the role (contacts_read).
 */
export default function ContactsScreen() {
  const access = useWorkspaceAccess().data;
  const canCreate = useCan("contacts_create");
  // Hidden only once access has loaded and says no (useCan is false while it loads).
  return <ContactList canCreate={canCreate} hidden={access ? !access.capabilities.contacts_read : false} />;
}

function ContactList({ canCreate, hidden }: { canCreate: boolean; hidden: boolean }) {
  const { colors } = useTheme();
  const scrim = useStatusBarScrim();
  const online = useOnline();
  const locale = getIntlLocale();
  // Links can open a filter ("?view=phone" from Today's "not called yet" suggestion).
  const { view: asked } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ContactFilter["view"]>(() => askedView(asked) ?? "all");
  const [seenAsked, setSeenAsked] = useState(asked);
  if (asked !== seenAsked) {
    setSeenAsked(asked);
    const next = askedView(asked);
    if (next) setView(next);
  }
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 300);
  const filter = useMemo<ContactFilter>(() => ({ view, search: debounced }), [view, debounced]);
  const list = useContactList(filter);
  const open = useCallback((c: Contact) => openContact(c.id), []);

  if (hidden) return <EmptyState icon={Lock} title={t("state.notAllowedTitle")} message={t("state.notAllowedMessage")} />;

  const filtered = debounced || view !== "all";
  const empty = list.isPending ? (
    <DelayedFallback>
      <SkeletonList rows={9} />
    </DelayedFallback>
  ) : list.isError ? (
    <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
  ) : (
    <EmptyState
      icon={Users}
      title={filtered ? t("inbox.emptyFilter") : t("contacts.emptyTitle")}
      message={debounced ? t("contacts.emptySearch") : filtered ? undefined : t("contacts.emptyMessage")}
    />
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={list.items}
        keyExtractor={(c) => String(c.id)}
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
            <TabHeader
              title={t("tabs.contacts")}
              summary={`${count(list.total, locale)} ${view === "mine" ? t("contacts.totalMine") : view === "phone" ? t("contacts.totalPhone") : t("contacts.totalAll")}`}
            />
            <View style={styles.pad}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t("contacts.search")} />
            </View>
            <FilterChips
              value={view}
              onChange={setView}
              options={[
                { key: "all", label: t("contacts.all") },
                { key: "mine", label: t("contacts.mine") },
                { key: "phone", label: t("contacts.withPhone") },
              ]}
            />
          </View>
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
        renderItem={({ item, index }) => (
          <ListReveal index={index}>
            <ContactRow contact={item} locale={locale} onPress={open} />
          </ListReveal>
        )}
      />
      {canCreate ? <Fab label={t("contacts.add")} onPress={() => openContactForm()} /> : null}
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

/** Stable separator: an inline one was a new component type on every render, so every divider remounted. */
function RowDivider() {
  return <Divider inset={gutter + 46 + space.md} />;
}

function askedView(v: string | undefined): ContactFilter["view"] | null {
  return v === "all" || v === "mine" || v === "phone" ? v : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: space.md, paddingBottom: space.sm },
  pad: { paddingHorizontal: gutter },
  footer: { height: 96 },
});
