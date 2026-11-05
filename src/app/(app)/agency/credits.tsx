import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { openAgencyClient, openAgencyReports, openBuyCredits, openMoveCredits } from "@/features/agency/navigate";
import { useAgencyCan, useAgencyCredits, useAgencyDashboard, useAgencyInfo } from "@/features/agency/useAgency";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getIntlLocale, t } from "@/i18n";
import { count, relativeTime, stableHash } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { avatarTones, gutter, radius, space } from "@/theme/tokens";
import type { Transfer } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { CardCell } from "@/ui/CardCell";
import { Button } from "@/ui/Button";
import { PressableScale } from "@/ui/PressableScale";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { ArrowUpCircle, BarChart, CircleMinus, Coins, ICON_STROKE, Sparkles } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { SectionHeader } from "@/ui/Section";
import { PullRefresh } from "@/ui/PullRefresh";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { Text } from "@/ui/Text";

/** Pure: which way a ledger row moved credits, seen from the agency. */
export function transferKind(tr: Pick<Transfer, "from_type" | "to_type">): "bought" | "given" | "takenBack" | "other" {
  if (tr.to_type === "agency" && tr.from_type === "platform") return "bought";
  if (tr.from_type === "agency" && (tr.to_type === "organization" || tr.to_type === "client")) return "given";
  if (tr.to_type === "agency" && tr.from_type === "organization") return "takenBack";
  return "other";
}

/** The credit pool: its balance, buy or give credits, and every movement (bought, given to clients, taken back). */
export default function AgencyCredits() {
  const { colors, scheme } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const scrim = useStatusBarScrim();
  const credits = useAgencyCredits();
  const canGive = useAgencyCan("manage_credits");
  const canBuy = useAgencyCan("manage_billing");
  const rows = useMemo(() => credits.data?.pages.flatMap((p) => p.transfers) ?? [], [credits.data]);
  const pool = credits.data?.pages[0]?.lead_credits;
  const insets = useSafeAreaInsets();
  // The strip under the pool: how many clients, what they hold between them, and the pool's AI tokens.
  const dashboard = useAgencyDashboard().data;
  const info = useAgencyInfo().data;
  const live = dashboard?.clients.filter((c) => !c.in_trash) ?? null;
  // The pool first, then the three clients holding the most credits, the rest as "Others" (each client in its avatar's tint).
  const holders = (live ?? []).filter((c) => c.credits_balance > 0).sort((a, b) => b.credits_balance - a.credits_balance);
  const where = [
    { key: "pool", label: t("agency.credits.pool"), value: pool ?? 0, color: colors.primaryFill },
    ...holders.slice(0, 3).map((c) => ({ key: `c${c.id}`, label: c.business_name || c.name, value: c.credits_balance, color: avatarTones(colors, scheme)[stableHash(c.business_name || c.name) % 6]!.fg })),
    ...(holders.length > 3 ? [{ key: "others", label: t("agency.credits.others"), value: holders.slice(3).reduce((n, c) => n + c.credits_balance, 0), color: colors.textSubtle }] : []),
  ].filter((w) => w.value > 0);
  const strip = [
    { label: t("agency.credits.clients"), value: live ? count(live.length, locale) : "—" },
    { label: t("agency.credits.withClients"), value: live ? count(live.reduce((n, c) => n + c.credits_balance, 0), locale) : "—" },
    { label: t("agency.credits.aiTokens"), value: info ? count(info.agency.ai_tokens, locale) : "—" },
  ];

  const label = (tr: Transfer) => {
    const kind = transferKind(tr);
    const who = tr.client ? tr.client.business_name || tr.client.name : null;
    if (kind === "bought") return t("agency.ledger.added");
    if (kind === "given") return who ? t("agency.ledger.givenTo", { name: who }) : t("agency.ledger.given");
    if (kind === "takenBack") return who ? t("agency.ledger.takenFrom", { name: who }) : t("agency.ledger.takenBack");
    return t("agency.ledger.moved");
  };

  const empty = credits.isPending ? (
    <DelayedFallback>
      <SkeletonList rows={6} />
    </DelayedFallback>
  ) : credits.isError ? (
    <ErrorState offline={!online} message={online ? userMessage(credits.error) : undefined} onRetry={() => void credits.refetch()} />
  ) : (
    <EmptyState icon={Coins} title={t("agency.ledger.emptyTitle")} message={t("agency.ledger.emptyMessage")} />
  );

  return (
    <View style={styles.fill}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<PullRefresh busy={credits.isRefetching && !credits.isFetchingNextPage} onRefresh={() => void credits.refetch()} progressViewOffset={insets.top + space.sm} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (credits.hasNextPage && !credits.isFetchingNextPage) void credits.fetchNextPage();
        }}
        ListHeaderComponent={
          <View>
            <AgencyHeader area="invoices" title={t("agency.tabs.credits")} summary={t("agency.credits.summary")} />
            <View style={styles.pad}>
              {/* The same glossy accent card as the pool on Home: one look for the same number. */}
              <View style={[styles.pool, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}>
                <Sheen />
                <Text variant="footnote" style={{ color: colors.onPrimaryMuted }}>
                  {t("agency.home.poolLabel")}
                </Text>
                <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.onPrimary }}>
                  {pool != null ? count(pool, locale) : "—"}
                </Text>
                <View style={[styles.strip, { backgroundColor: colors.primaryTrack }]}>
                  {strip.map((s, i) => (
                    <View key={s.label} style={[styles.stripItem, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.onPrimaryMuted }]}>
                      <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.onPrimary }}>
                        {s.value}
                      </Text>
                      <Text variant="caption" numberOfLines={1} style={{ color: colors.onPrimaryMuted }}>
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* One row: the two money actions share it, usage is the round button at the end. */}
                <View style={styles.actions}>
                  {canBuy ? <Button label={t("agency.credits.buy")} icon={ArrowUpCircle} size="sm" variant="onFill" onPress={openBuyCredits} style={styles.action} /> : null}
                  {canGive ? <Button label={t("agency.credits.give")} icon={Sparkles} size="sm" variant="glass" onPress={() => openMoveCredits()} style={styles.action} /> : null}
                  <PressableScale
                    onPress={() => openAgencyReports("usage")}
                    accessibilityRole="button"
                    accessibilityLabel={t("agency.credits.usage")}
                    style={[styles.round, { backgroundColor: colors.primaryTrack }]}
                  >
                    <BarChart size={17} color={colors.onPrimary} strokeWidth={ICON_STROKE + 0.25} />
                  </PressableScale>
                </View>
              </View>
            </View>
            {where.length > 1 ? (
              <View style={[styles.where, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}>
                <Text variant="headline">{t("agency.credits.where")}</Text>
                <View style={styles.whereBar} accessible accessibilityLabel={where.map((w) => `${w.label} ${count(w.value, locale)}`).join(", ")}>
                  {where.map((w) => (
                    <View key={w.key} style={[styles.whereSeg, { flex: Math.max(w.value, 1), backgroundColor: w.color }]} />
                  ))}
                </View>
                <View style={styles.legend}>
                  {where.map((w) => (
                    <View key={w.key} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: w.color }]} />
                      <Text variant="footnote" tone="secondary" numberOfLines={1} style={styles.flex}>
                        {w.label}
                      </Text>
                      <Text variant="footnote" weight="semibold" numeric>
                        {count(w.value, locale)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <SectionHeader title={t("agency.ledger.title")} />
          </View>
        }
        ListEmptyComponent={empty}
        ListFooterComponent={credits.isFetchingNextPage ? <SkeletonList rows={2} /> : <View style={styles.footer} />}
        renderItem={({ item, index }) => {
          const kind = transferKind(item);
          const out = kind === "given";
          const Icon = kind === "takenBack" ? CircleMinus : out ? Sparkles : ArrowUpCircle;
          return (
            <CardCell first={index === 0} last={index === rows.length - 1} inset={gutter + 36 + space.md}>
              <ListRow
                title={label(item)}
                titleLines={2}
                subtitle={[item.note, item.created_at ? relativeTime(item.created_at, locale) : null].filter(Boolean).join(" · ")}
                leading={
                  item.client ? (
                    <Avatar name={item.client.business_name || item.client.name} size={36} />
                  ) : (
                    <View style={[styles.icon, { backgroundColor: out ? colors.primarySubtle : colors.successSurface }]}>
                      <Icon size={17} color={out ? colors.primary : colors.success} strokeWidth={ICON_STROKE + 0.25} />
                    </View>
                  )
                }
                trailing={
                  <Text variant="callout" weight="semibold" numeric style={{ color: out ? colors.text : colors.successText }}>
                    {item.lead_credits === 0 && item.ai_tokens > 0
                      ? t("agency.ledger.aiTokens", { count: `${out ? "−" : "+"}${count(item.ai_tokens, locale)}` })
                      : `${out ? "−" : "+"}${count(item.lead_credits, locale)}`}
                  </Text>
                }
                onPress={item.client ? () => openAgencyClient(item.client!.id) : undefined}
              />
            </CardCell>
          );
        }}
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}


const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: gutter },
  pool: { borderRadius: radius.xxl, padding: space.xl, overflow: "hidden" },
  strip: { flexDirection: "row", marginTop: space.md, paddingVertical: space.sm + 2, borderRadius: radius.lg },
  stripItem: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: space.xs },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  action: { flex: 1 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  where: { marginHorizontal: gutter, marginTop: space.md, padding: space.lg, gap: space.md, borderRadius: radius.xl + 4 },
  whereBar: { flexDirection: "row", gap: 3, height: 12 },
  whereSeg: { borderRadius: 6 },
  legend: { flexDirection: "row", flexWrap: "wrap", rowGap: space.sm, columnGap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.sm, width: "100%" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1, minWidth: 0 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  footer: { height: space.xxl },
});
