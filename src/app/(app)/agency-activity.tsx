import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { openAgencyClient } from "@/features/agency/navigate";
import { useAgencyActivity } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { dateTime } from "@/lib/format";
import { useDebounced } from "@/lib/useDebounced";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Activity } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { SearchBar } from "@/ui/SearchBar";
import { Divider } from "@/ui/Section";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";

/** The agency's audit log (admins): who did what, newest first, searchable. */
export default function AgencyActivityScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const feed = useAgencyActivity(q);
  const rows = useMemo(() => feed.data?.pages.flatMap((p) => p.activity) ?? [], [feed.data]);

  return (
    <>
      <Stack.Screen options={{ title: t("agency.activity.title") }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          onRefresh={() => void feed.refetch()}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          ItemSeparatorComponent={RowDivider}
          ListHeaderComponent={
            <View style={styles.search}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t("agency.activity.search")} />
            </View>
          }
          ListEmptyComponent={
            feed.isPending ? (
              <DelayedFallback>
                <SkeletonList rows={8} />
              </DelayedFallback>
            ) : feed.isError ? (
              <ErrorState offline={!online} message={online ? userMessage(feed.error) : undefined} onRetry={() => void feed.refetch()} />
            ) : (
              <EmptyState icon={Activity} title={t("agency.activity.emptyTitle")} message={t("agency.activity.emptyMessage")} />
            )
          }
          ListFooterComponent={feed.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.summary}
              titleLines={2}
              subtitle={[item.actor?.name || item.actor?.email, item.at ? dateTime(item.at, locale) : null].filter(Boolean).join(" · ")}
              subtitleLines={1}
              chevron={item.client_id != null}
              onPress={item.client_id != null ? () => openAgencyClient(item.client_id!) : undefined}
            />
          )}
        />
      </View>
    </>
  );
}

function RowDivider() {
  return <Divider inset={gutter} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { paddingHorizontal: gutter, paddingVertical: space.sm },
  footer: { height: space.huge },
});
