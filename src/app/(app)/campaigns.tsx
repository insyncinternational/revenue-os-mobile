import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { campaignChannels, campaignStatus, campaignTotals, guardPaused, reachedShare, sortCampaigns, STATUS_TONE } from "@/features/campaigns/campaign";
import { useCampaigns, usePauseCampaign } from "@/features/campaigns/useCampaigns";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { useOnline } from "@/query/useOnline";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Campaign, CampaignStatus } from "@/types/campaign";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { ChannelGlyph } from "@/ui/ChannelIcon";
import { FilterChips } from "@/ui/Chip";
import { PauseCircle, Send } from "@/ui/icons";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

type Filter = "live" | "all";

/** How campaigns are doing, at a glance — and Pause when one needs stopping now. Building and resuming stay on the web. */
export default function CampaignsScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const canPause = useCan("campaigns_pause");
  const list = useCampaigns();
  const pause = usePauseCampaign();
  const [filter, setFilter] = useState<Filter>("live");

  const sorted = useMemo(() => sortCampaigns(list.data ?? []), [list.data]);
  const live = useMemo(() => sorted.filter((c) => ["running", "paused"].includes(campaignStatus(c))), [sorted]);
  const items = filter === "live" ? live : sorted;

  const askPause = async (c: Campaign) => {
    if (await confirm(t("campaigns.pauseConfirm", { name: c.name }), t("campaigns.pause"), t("common.cancel"), true)) pause.mutate(c);
  };

  return (
    <>
      <Stack.Screen options={{ title: t("campaigns.title") }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={items}
          keyExtractor={(c) => String(c.id)}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={() => void list.refetch()}
          refreshing={list.isRefetching}
          ListHeaderComponent={
            <View style={styles.filters}>
              <FilterChips<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { key: "live", label: t("campaigns.live"), count: live.length },
                  { key: "all", label: t("campaigns.all") },
                ]}
              />
              <Text variant="footnote" tone="muted" style={styles.hint}>
                {t("campaigns.webHint")}
              </Text>
            </View>
          }
          ListEmptyComponent={
            list.isPending ? (
              <DelayedFallback>
                <SkeletonList rows={4} avatar={false} />
              </DelayedFallback>
            ) : list.isError ? (
              <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
            ) : (
              <EmptyState icon={Send} title={filter === "live" ? t("campaigns.noneLive") : t("campaigns.none")} message={t("campaigns.noneMessage")} />
            )
          }
          ListFooterComponent={<View style={styles.footer} />}
          renderItem={({ item }) => (
            <CampaignCard campaign={item} locale={locale} canPause={canPause} pausing={pause.isPending && pause.variables?.id === item.id} onPause={() => void askPause(item)} />
          )}
        />
      </View>
    </>
  );
}

function CampaignCard({ campaign: c, locale, canPause, pausing, onPause }: { campaign: Campaign; locale: string; canPause: boolean; pausing: boolean; onPause: () => void }) {
  const { colors } = useTheme();
  const status = campaignStatus(c);
  const { leads, sent, replies, replyRate } = campaignTotals(c);
  const share = reachedShare(c);
  const fmt = (n: number) => n.toLocaleString(locale);
  const stats: { label: string; value: string }[] =
    status === "draft"
      ? [{ label: t("campaigns.leads"), value: leads ? fmt(leads) : "—" }]
      : [
          { label: t("campaigns.leads"), value: leads ? fmt(leads) : "—" },
          { label: t("campaigns.sent"), value: fmt(sent) },
          // Below 10 sends a rate is noise ("100%" from two emails): the count says enough.
          { label: t("campaigns.replies"), value: replies && replyRate != null && sent >= 10 ? `${fmt(replies)} · ${replyRate.toLocaleString(locale)}%` : fmt(replies) },
        ];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} accessible={!canPause} accessibilityLabel={`${c.name}. ${t(`campaigns.status_${status}` as TranslationKey)}`}>
      <View style={styles.head}>
        <Text variant="callout" weight="semibold" numberOfLines={2} style={styles.flex}>
          {c.name}
        </Text>
        <Badge label={t(`campaigns.status_${status}` as TranslationKey)} tone={STATUS_TONE[status as CampaignStatus]} />
      </View>
      <View style={styles.channels}>
        {campaignChannels(c).map((ch) => (
          <ChannelGlyph key={ch} channel={ch} size={14} />
        ))}
      </View>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text variant="caption" tone="muted">
              {s.label}
            </Text>
            <Text variant="headline" numeric numberOfLines={1}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
      {share != null ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressHead}>
            <Text variant="caption" tone="muted">
              {t("campaigns.reached")}
            </Text>
            <Text variant="caption" weight="semibold" numeric>
              {`${Math.round(share * 100)}%`}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.surfaceTertiary }]}>
            <View style={[styles.fillBar, { width: `${share > 0 ? Math.max(4, Math.round(share * 100)) : 0}%`, backgroundColor: status === "paused" ? colors.warning : colors.primaryFill }]} />
          </View>
        </View>
      ) : null}
      {guardPaused(c) ? (
        <Text variant="footnote" tone="warning">
          {t("campaigns.guardPaused")}
        </Text>
      ) : status === "paused" ? (
        <Text variant="footnote" tone="muted">
          {t("campaigns.resumeOnWeb")}
        </Text>
      ) : null}
      {canPause && status === "running" ? <Button label={t("campaigns.pause")} icon={PauseCircle} variant="secondary" size="sm" loading={pausing} onPress={onPause} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  filters: { paddingTop: space.xs, paddingBottom: space.sm, gap: space.sm },
  hint: { paddingHorizontal: gutter },
  footer: { height: 48 },
  card: { marginHorizontal: gutter, marginBottom: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  channels: { flexDirection: "row", gap: space.sm },
  stats: { flexDirection: "row", gap: space.lg },
  stat: { flex: 1, minWidth: 0, gap: 2 },
  progressWrap: { gap: 6 },
  progressHead: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fillBar: { height: 6, borderRadius: 3 },
});
