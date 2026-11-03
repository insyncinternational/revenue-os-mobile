import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { cents, paidShare as share, perCurrency } from "@/features/invoices/invoice";
import { InvoiceRow } from "@/features/invoices/InvoiceRow";
import { useInvoiceList, usePayments } from "@/features/invoices/useInvoices";
import { getIntlLocale, t } from "@/i18n";
import { openInvoice, openInvoiceForm } from "@/lib/navigate";
import { dayKey } from "@/lib/when";
import { useOnline } from "@/query/useOnline";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { InvoiceStatus } from "@/types/invoice";
import { Banner } from "@/ui/Banner";
import { Card } from "@/ui/Card";
import { FilterChips } from "@/ui/Chip";
import { Fab } from "@/ui/Fab";
import { ListReveal } from "@/ui/ListReveal";
import { FileText } from "@/ui/icons";
import { DelayedFallback, Skeleton, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";
import { INVOICES_LIMIT } from "@/api/invoices";

type Filter = InvoiceStatus | "all";

/** What's owed and what came in, then every invoice by status. New ones from the ＋ button, a deal, or the web. */
export default function InvoicesScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const canEdit = useCan("invoices_edit");
  const [filter, setFilter] = useState<Filter>("all");
  const [today] = useState(() => dayKey(new Date()));
  const list = useInvoiceList(filter === "all" ? null : filter);
  const payments = usePayments(canEdit);
  const summary = list.data?.summary;
  const rows = useMemo(() => list.data?.invoices ?? [], [list.data]);
  const outstanding = summary ? perCurrency(summary.outstanding, locale) : null;
  const collected = summary ? perCurrency(summary.collected, locale) : null;
  // Nothing owed still shows a real amount, in the currency its invoices use — also on a filter with no rows (the full
  // list is usually cached already), else the workspace's payment currency.
  const allList = useInvoiceList(null, filter !== "all").data;
  const currency =
    (summary ? Object.keys(summary.collected)[0] : undefined) ?? rows[0]?.currency ?? allList?.invoices[0]?.currency ?? payments.data?.default_currency ?? undefined;
  // Paid vs still owed, in the main currency (other currencies can't be added up).
  const paidShare = summary && currency ? share(summary.collected[currency] ?? 0, summary.outstanding[currency] ?? 0) : null;
  const notConnected = canEdit && payments.data && !payments.data.charges_enabled && (summary?.draft ?? 0) > 0;

  return (
    <>
      <Stack.Screen options={{ title: t("invoice.title") }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={rows}
          keyExtractor={(i) => String(i.id)}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={() => {
            void list.refetch();
            void payments.refetch();
          }}
          refreshing={list.isRefetching}
          ListHeaderComponent={
            <View style={styles.header}>
              <Card elevated style={styles.card} contentStyle={styles.summary}>
                {summary ? (
                  // What came in leads (the good news), what's still owed beside it, and a bar of paid vs owed.
                  <>
                    <View style={styles.amounts}>
                      <View style={styles.flex}>
                        <Text variant="footnote" tone="muted">
                          {t("invoice.collectedLabel")}
                        </Text>
                        <Text variant="title" numeric numberOfLines={1} adjustsFontSizeToFit style={{ color: collected ? colors.success : colors.text }}>
                          {collected ?? (currency ? cents(0, currency, locale) : "—")}
                        </Text>
                      </View>
                      <View style={styles.flex}>
                        <Text variant="footnote" tone="muted">
                          {t("invoice.outstanding")}
                        </Text>
                        <Text variant="title" numeric numberOfLines={1} adjustsFontSizeToFit>
                          {outstanding ?? (currency ? cents(0, currency, locale) : "—")}
                        </Text>
                      </View>
                    </View>
                    {paidShare != null ? (
                      <View style={[styles.track, { backgroundColor: summary.overdue ? colors.warningSurface : colors.surfaceTertiary }]}>
                        <View style={[styles.paid, { width: `${Math.max(paidShare, 0.02) * 100}%`, backgroundColor: colors.success }]} />
                      </View>
                    ) : null}
                    {summary.overdue ? (
                      <Text variant="footnote" tone="warning" weight="semibold">
                        {t("invoice.overdueCount", { count: summary.overdue })}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Skeleton width={90} height={14} />
                    <Skeleton width={180} height={32} />
                    <Skeleton width={140} height={14} />
                  </>
                )}
              </Card>
              {notConnected ? (
                <View style={styles.block}>
                  <Banner kind="info" message={t("invoice.connectStripe")} />
                </View>
              ) : null}
              <FilterChips<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { key: "all", label: t("invoice.all") },
                  { key: "draft", label: t("invoice.drafts"), count: summary?.draft },
                  { key: "sent", label: t("invoice.status_sent"), count: summary?.open },
                  { key: "overdue", label: t("invoice.status_overdue"), count: summary?.overdue },
                  { key: "paid", label: t("invoice.status_paid") },
                  { key: "void", label: t("invoice.status_void") },
                ]}
              />
            </View>
          }
          ListEmptyComponent={
            list.isPending ? (
              <DelayedFallback>
                <SkeletonList rows={5} />
              </DelayedFallback>
            ) : list.isError ? (
              <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
            ) : (
              <EmptyState
                icon={FileText}
                title={filter === "all" ? t("invoice.none") : t("invoice.noneHere")}
                message={filter === "all" ? t("invoice.noneMessage") : undefined}
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {rows.length >= INVOICES_LIMIT ? (
                <Text variant="footnote" tone="muted" align="center">
                  {t("invoice.showingNewest", { count: INVOICES_LIMIT })}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <ListReveal index={index}>
              <InvoiceRow invoice={item} locale={locale} today={today} onOpen={(inv) => openInvoice(inv.id)} />
            </ListReveal>
          )}
        />
        {canEdit ? <Fab inStack label={t("invoiceForm.title")} onPress={() => openInvoiceForm()} /> : null}
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingTop: space.sm, paddingBottom: space.md, gap: space.md },
  card: { marginHorizontal: gutter },
  summary: { gap: space.md },
  amounts: { flexDirection: "row", gap: space.lg },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  paid: { height: 8, borderRadius: radius.pill },
  block: { paddingHorizontal: gutter },
  footer: { minHeight: space.huge, paddingTop: space.lg, paddingHorizontal: gutter },
});
