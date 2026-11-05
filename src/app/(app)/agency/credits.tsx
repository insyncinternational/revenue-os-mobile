import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { openAgencyClient, openAgencyReports, openBuyCredits, openMoveCredits } from "@/features/agency/navigate";
import { useAgencyCan, useAgencyCredits } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { count, relativeTime } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Transfer } from "@/types/agency";
import { Button } from "@/ui/Button";
import { CardCell } from "@/ui/CardCell";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { ArrowUpCircle, BarChart, CircleMinus, Coins, ICON_STROKE, Sparkles } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { SectionHeader } from "@/ui/Section";
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
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const scrim = useStatusBarScrim();
  const credits = useAgencyCredits();
  const canGive = useAgencyCan("manage_credits");
  const canBuy = useAgencyCan("manage_billing");
  const rows = useMemo(() => credits.data?.pages.flatMap((p) => p.transfers) ?? [], [credits.data]);
  const pool = credits.data?.pages[0]?.lead_credits;

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
        onRefresh={() => void credits.refetch()}
        refreshing={credits.isRefetching && !credits.isFetchingNextPage}
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
                <View style={styles.actions}>
                  {canBuy ? <Button label={t("agency.credits.buy")} icon={ArrowUpCircle} size="sm" onPress={openBuyCredits} /> : null}
                  {canGive ? <Button label={t("agency.credits.give")} icon={Sparkles} size="sm" variant="secondary" onPress={() => openMoveCredits()} /> : null}
                  <Button label={t("agency.credits.usage")} icon={BarChart} size="sm" variant="secondary" onPress={() => openAgencyReports("usage")} />
                </View>
              </View>
            </View>
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
            <CardCell first={index === 0} last={index === rows.length - 1} inset={ROW_INSET}>
              <ListRow
                title={label(item)}
                subtitle={[item.note, item.created_at ? relativeTime(item.created_at, locale) : null].filter(Boolean).join(" · ")}
                leading={
                  <View style={[styles.icon, { backgroundColor: out ? colors.primarySubtle : colors.successSurface }]}>
                    <Icon size={17} color={out ? colors.primary : colors.success} strokeWidth={ICON_STROKE + 0.25} />
                  </View>
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

/** The hairline between ledger rows starts under the text (row padding + icon + gap). */
const ROW_INSET = gutter + 36 + space.md;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: gutter },
  pool: { borderRadius: radius.xxl, padding: space.xl, overflow: "hidden" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  footer: { height: 96 },
});
