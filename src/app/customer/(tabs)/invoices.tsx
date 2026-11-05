import { StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { userMessage } from "@/api/errors";
import { owed, unpaidInvoices } from "@/portal/portal";
import { CustomerHeader } from "@/portal/CustomerHeader";
import { usePortalInvoices } from "@/portal/usePortal";
import { getIntlLocale, t } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import type { PortalInvoice } from "@/types/portal";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { FileText, Receipt } from "@/ui/icons";
import { RowIcon } from "@/ui/RowIcon";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";

/** Pure: how an invoice's status reads. */
export function invoiceBadge(i: Pick<PortalInvoice, "status" | "due_date" | "total_cents" | "amount_paid_cents">, now: number): { key: "portal.inv.paid" | "portal.inv.overdue" | "portal.inv.open" | "portal.inv.void"; tone: BadgeTone } {
  if (i.status === "paid" || owed(i) === 0) return { key: "portal.inv.paid", tone: "success" };
  if (i.status === "void" || i.status === "uncollectible") return { key: "portal.inv.void", tone: "neutral" };
  if (i.due_date && Date.parse(i.due_date) < now) return { key: "portal.inv.overdue", tone: "danger" };
  return { key: "portal.inv.open", tone: "warning" };
}

/** The customer's invoices: pay what's open (on the business's secure pay page), see receipts for the rest. */
export default function CustomerInvoices() {
  const online = useOnline();
  const locale = getIntlLocale();
  const invoices = usePortalInvoices();
  const now = invoices.dataUpdatedAt || 0;
  const all = invoices.data?.invoices ?? [];
  const unpaid = unpaidInvoices(all);
  const rest = all.filter((i) => !unpaid.includes(i));
  const amount = (i: PortalInvoice, cents: number) => money(cents / 100, i.currency.toUpperCase(), locale);

  const open = (url: string) => void WebBrowser.openBrowserAsync(url).then(() => invoices.refetch());

  const row = (i: PortalInvoice, n: number) => {
    const badge = invoiceBadge(i, now);
    return (
      <View key={i.id}>
        {n > 0 ? <Divider inset={gutter} /> : null}
        <ListRow
          title={t("portal.inv.number", { number: i.number })}
          subtitle={[amount(i, i.total_cents), i.paid_at ? t("portal.inv.paidOn", { date: dateTime(i.paid_at, locale) }) : i.due_date ? t("portal.inv.due", { date: dateTime(i.due_date, locale) }) : null].filter(Boolean).join(" · ")}
          leading={<RowIcon icon={Receipt} />}
          trailing={<Badge label={t(badge.key)} tone={badge.tone} />}
          onPress={i.view_url ? () => open(i.view_url!) : i.pay_url ? () => open(i.pay_url!) : undefined}
        />
      </View>
    );
  };

  return (
    <Screen contentInsetAdjustmentBehavior="never" onRefresh={() => void invoices.refetch()} refreshing={invoices.isRefetching}>
      <CustomerHeader title={t("portal.tabs.invoices")} summary={unpaid.length ? t("portal.inv.unpaidCount", { count: unpaid.length }) : t("portal.inv.allPaid")} />
      {!online ? <OfflineBanner /> : null}
      {!invoices.data ? (
        invoices.isError ? <ErrorState message={userMessage(invoices.error)} onRetry={() => void invoices.refetch()} /> : <SkeletonList rows={4} />
      ) : all.length === 0 ? (
        <EmptyState icon={FileText} title={t("portal.inv.emptyTitle")} message={t("portal.inv.emptyMessage")} />
      ) : (
        <>
          {unpaid.length > 0 ? (
            <>
              <SectionHeader title={t("portal.home.toPay")} />
              <View style={styles.list}>
                {unpaid.map((i) => (
                  <Card key={i.id} contentStyle={styles.payCard}>
                    {row(i, 0)}
                    {i.pay_url ? <Button label={t("portal.inv.pay", { amount: amount(i, owed(i)) })} fullWidth onPress={() => open(i.pay_url!)} /> : null}
                  </Card>
                ))}
              </View>
            </>
          ) : null}
          {rest.length > 0 ? (
            <>
              <SectionHeader title={t("portal.inv.history")} />
              <Card padded={false} style={styles.card}>
                {rest.map(row)}
              </Card>
            </>
          ) : null}
        </>
      )}
      <View style={styles.footer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: gutter, gap: space.sm },
  payCard: { gap: space.sm },
  card: { marginHorizontal: gutter },
  footer: { height: space.huge },
});
