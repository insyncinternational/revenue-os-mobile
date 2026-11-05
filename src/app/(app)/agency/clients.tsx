import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { ClientRowItem } from "@/features/agency/ClientRowItem";
import { openNewClient } from "@/features/agency/navigate";
import { useAgencyCan, useAgencyClients } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { count } from "@/lib/format";
import { useDebounced } from "@/lib/useDebounced";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import type { ClientStatusFilter } from "@/types/agency";
import { FilterChips } from "@/ui/Chip";
import { CardCell } from "@/ui/CardCell";
import { Users } from "@/ui/icons";
import { ListReveal } from "@/ui/ListReveal";
import { SearchBar } from "@/ui/SearchBar";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";

/** Every client the person may see (agency users: their assigned ones), searchable, with Suspended and Trash views. */
export default function AgencyClients() {
  const online = useOnline();
  const locale = getIntlLocale();
  const scrim = useStatusBarScrim();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatusFilter>("all");
  const q = useDebounced(search);
  const list = useAgencyClients(q, status);
  const canCreate = useAgencyCan("create_clients");
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.clients) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  const empty = list.isPending ? (
    <DelayedFallback>
      <SkeletonList rows={8} />
    </DelayedFallback>
  ) : list.isError ? (
    <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
  ) : q || status !== "all" ? (
    <EmptyState icon={Users} title={t("agency.clients.noMatchTitle")} message={t("agency.clients.noMatchMessage")} />
  ) : (
    <EmptyState
      area="contacts"
      icon={Users}
      title={t("agency.home.noClientsTitle")}
      message={t("agency.home.noClientsMessage")}
      actionLabel={canCreate ? t("agency.quick.addClient") : undefined}
      onAction={canCreate ? openNewClient : undefined}
    />
  );

  return (
    <View style={styles.fill}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={rows}
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
        ListHeaderComponent={
          <View style={styles.header}>
            <AgencyHeader action={canCreate ? { label: t("agency.quick.addClient"), onPress: openNewClient } : undefined} area="contacts" title={t("agency.tabs.clients")} summary={list.data ? t("agency.clients.total", { count: count(total, locale) }) : null} />
            <View style={styles.pad}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t("workspace.searchClients")} />
            </View>
            <FilterChips<ClientStatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { key: "all", label: t("agency.clients.all") },
                { key: "suspended", label: t("agency.clients.suspended") },
                { key: "trash", label: t("agency.clients.trash") },
              ]}
            />
          </View>
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
        renderItem={({ item, index }) => (
          <ListReveal index={index}>
            <CardCell first={index === 0} last={index === rows.length - 1} inset={ROW_INSET}>
              <ClientRowItem client={item} />
            </CardCell>
          </ListReveal>
        )}
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

/** The hairline between clients starts under the name (row padding + avatar + gap). */
const ROW_INSET = gutter + 40 + space.md;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingBottom: space.sm, gap: space.sm },
  pad: { paddingHorizontal: gutter },
  footer: { height: 96 },
});
