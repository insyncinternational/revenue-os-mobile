import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { invoicePdfUrl } from "@/api/invoices";
import { userMessage } from "@/api/errors";
import { balanceDue, cents, invoiceActions, STATUS_TONE } from "@/features/invoices/invoice";
import { invoiceWhen } from "@/features/invoices/InvoiceRow";
import { sharePayLink } from "@/features/invoices/sharePayLink";
import { useInvoice, useInvoiceAction, usePayments } from "@/features/invoices/useInvoices";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { openContact, openDeal } from "@/lib/navigate";
import { dayKey } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { Badge } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { GradientFill } from "@/ui/Gradient";
import { Ban, CheckCircle2, ChevronRight, ExternalLink, FileText, ICON_STROKE, KanbanSquare, Mail, Send, Share2, UserRound, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

const WASH: Record<InvoiceStatus, keyof Palette> = { draft: "surfaceTertiary", sent: "infoSurface", overdue: "dangerSurface", paid: "successSurface", void: "surfaceTertiary" };

/** How much and who for, the next step for its status (send, share the pay link, mark paid), then the lines. */
export default function InvoiceScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const toast = useToast();
  const query = useInvoice(id);
  const action = useInvoiceAction(id);
  const canEdit = useCan("invoices_edit");
  const payments = usePayments(canEdit);
  const [today] = useState(() => dayKey(new Date()));
  const inv = query.data?.invoice;

  if (!inv) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <Screen>
          {query.isPending ? (
            <DelayedFallback>
              <View style={styles.hero}>
                <Skeleton width={80} height={20} />
                <Skeleton width={200} height={34} />
                <Skeleton width={150} height={16} />
              </View>
            </DelayedFallback>
          ) : (
            <View style={styles.errorPad}>
              <ErrorState message={userMessage(query.error)} onRetry={() => void query.refetch()} />
            </View>
          )}
        </Screen>
      </>
    );
  }

  const can = invoiceActions(inv);
  const open = inv.status === "sent" || inv.status === "overdue";
  const amount = open ? balanceDue(inv) : inv.total_cents;
  const when = invoiceWhen(inv, locale, today);
  // Sending (email or link) needs the workspace's Stripe connected — say so before the user tries.
  const stripeMissing = canEdit && can.send && payments.data != null && !payments.data.charges_enabled;
  const busy = action.isPending;

  /** Marks a draft sent (when needed), then opens the phone's share sheet with the pay link. */
  const share = async (current: Invoice) => {
    let target = current;
    if (current.status === "draft") {
      try {
        target = (await action.mutateAsync({ kind: "link" })).invoice;
      } catch {
        return; // the error toast is already showing
      }
    }
    await sharePayLink(target, locale, toast);
  };

  const markPaid = async () => {
    if (await confirm(t("invoice.markPaidConfirm", { amount: cents(balanceDue(inv), inv.currency, locale) }), t("invoice.markPaid"), t("common.cancel"))) action.mutate({ kind: "paid" });
  };
  const voidIt = async () => {
    if (await confirm(t("invoice.voidConfirm"), t("invoice.void"), t("common.back"), true)) action.mutate({ kind: "void" });
  };
  const pdf = invoicePdfUrl(inv);

  return (
    <>
      <Stack.Screen options={{ title: inv.number }} />
      <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
        <View style={styles.hero}>
          <GradientFill from={colors[WASH[inv.status]]} to={colors.background} vertical />
          <View style={styles.badgeRow}>
            <Badge label={t(`invoice.status_${inv.status}` as TranslationKey)} tone={STATUS_TONE[inv.status]} />
            {when ? (
              <Text variant="footnote" tone={inv.status === "overdue" ? "danger" : "muted"} weight={inv.status === "overdue" ? "medium" : undefined}>
                {when}
              </Text>
            ) : null}
          </View>
          <Text variant="footnote" tone="muted">
            {open ? t("invoice.balanceDue") : t("invoice.total")}
          </Text>
          <Text variant="largeTitle" numeric numberOfLines={1} adjustsFontSizeToFit style={inv.status === "void" ? styles.struck : undefined}>
            {cents(amount, inv.currency, locale)}
          </Text>
          <Text variant="callout" tone="secondary" numberOfLines={1}>
            {[inv.customer_name, inv.customer_email].filter(Boolean).join(" · ") || t("invoice.noCustomer")}
          </Text>

          {/* Without Stripe the send buttons would only sit greyed out under the notice that says why: hide them. */}
          {canEdit && (can.send || can.share || can.markPaid) && !stripeMissing ? (
            <View style={styles.actions}>
              {can.send ? (
                <>
                  {inv.customer_email ? <Button label={t("invoice.sendEmail")} icon={Send} loading={busy && action.variables?.kind === "email"} onPress={() => action.mutate({ kind: "email" })} style={styles.flexBtn} /> : null}
                  <Button
                    label={t("invoice.shareLink")}
                    icon={Share2}
                    variant={inv.customer_email ? "secondary" : "primary"}
                    loading={busy && action.variables?.kind === "link"}
                    onPress={() => void share(inv)}
                    style={styles.flexBtn}
                  />
                </>
              ) : (
                <>
                  <Button label={t("invoice.shareLink")} icon={Share2} onPress={() => void share(inv)} style={styles.flexBtn} />
                  <Button label={t("invoice.markPaid")} icon={CheckCircle2} variant="secondary" loading={busy && action.variables?.kind === "paid"} onPress={() => void markPaid()} style={styles.flexBtn} />
                </>
              )}
            </View>
          ) : null}
        </View>

        {stripeMissing ? (
          <View style={styles.block}>
            <Banner kind="info" message={t("invoice.connectStripe")} />
          </View>
        ) : null}
        {canEdit && can.send && !stripeMissing && !inv.customer_email ? (
          <View style={styles.block}>
            <Text variant="footnote" tone="muted">
              {t("invoice.noEmailHint")}
            </Text>
          </View>
        ) : null}

        <Reveal index={0}>
          <SectionHeader title={t("invoice.items")} />
          <Card padded={false} style={styles.card}>
            {inv.items.map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <Divider inset={space.lg} /> : null}
                <View style={styles.line}>
                  <View style={styles.flex}>
                    <Text variant="callout" weight="medium" numberOfLines={2}>
                      {item.name || t("invoice.item")}
                    </Text>
                    <Text variant="footnote" tone="muted" numeric>
                      {`${item.quantity} × ${cents(item.unit_price_cents, inv.currency, locale)}`}
                    </Text>
                  </View>
                  <Text variant="callout" weight="semibold" numeric>
                    {cents(item.amount_cents, inv.currency, locale)}
                  </Text>
                </View>
              </View>
            ))}
            <Divider />
            <View style={styles.totals}>
              {inv.tax_cents > 0 ? (
                <>
                  <Total label={t("invoice.subtotal")} value={cents(inv.subtotal_cents, inv.currency, locale)} />
                  <Total label={t("invoice.tax", { rate: (inv.tax_rate_bps / 100).toLocaleString(locale) })} value={cents(inv.tax_cents, inv.currency, locale)} />
                </>
              ) : null}
              <Total label={t("invoice.total")} value={cents(inv.total_cents, inv.currency, locale)} strong />
              {inv.amount_paid_cents > 0 ? <Total label={t("invoice.paid")} value={`−${cents(inv.amount_paid_cents, inv.currency, locale)}`} /> : null}
              {open && inv.amount_paid_cents > 0 ? <Total label={t("invoice.balanceDue")} value={cents(balanceDue(inv), inv.currency, locale)} strong /> : null}
            </View>
          </Card>
        </Reveal>

        {inv.lead_id || inv.deal_id ? (
          <Reveal index={1}>
            <SectionHeader title={t("invoice.linked")} />
            <Card padded={false} style={styles.card}>
              {inv.lead_id ? <LinkRow icon={UserRound} label={t("pipeline.contact")} value={inv.customer_name || t("meeting.viewContact")} onPress={() => openContact(inv.lead_id!)} /> : null}
              {inv.lead_id && inv.deal_id ? <Divider inset={space.lg + 36 + space.md} /> : null}
              {inv.deal_id ? <LinkRow icon={KanbanSquare} label={t("invoice.deal")} value={t("invoice.openDeal")} onPress={() => openDeal(inv.deal_id!)} /> : null}
            </Card>
          </Reveal>
        ) : null}

        {inv.notes ? (
          <Reveal index={2}>
            <SectionHeader title={t("meeting.notes")} />
            <Card style={styles.card}>
              <Text variant="body" tone="secondary" selectable>
                {inv.notes}
              </Text>
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <View style={styles.more}>
            {can.pdf && pdf ? <Button label={t("invoice.openPdf")} icon={FileText} variant="ghost" onPress={() => void Linking.openURL(pdf)} /> : null}
            {can.pdf ? <Button label={t("invoice.viewAsCustomer")} icon={ExternalLink} variant="ghost" onPress={() => void Linking.openURL(inv.pay_url)} /> : null}
            {canEdit && open && can.email ? <Button label={t("invoice.emailAgain")} icon={Mail} variant="ghost" loading={busy && action.variables?.kind === "email"} onPress={() => action.mutate({ kind: "email" })} /> : null}
            {canEdit && can.void ? <Button label={t("invoice.void")} icon={Ban} variant="danger" onPress={() => void voidIt()} /> : null}
          </View>
        </Reveal>
      </Screen>
    </>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text variant={strong ? "callout" : "subhead"} weight={strong ? "semibold" : undefined} tone={strong ? "default" : "muted"}>
        {label}
      </Text>
      <Text variant={strong ? "headline" : "subhead"} numeric tone={strong ? "default" : "secondary"}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({ icon: Icon, label, value, onPress }: { icon: IconComponent; label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${label}: ${value}`} scaleTo={0.99} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon size={16} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="callout" weight="semibold" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.xs, overflow: "hidden" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  flexBtn: { flex: 1, alignSelf: "auto" },
  struck: { textDecorationLine: "line-through" },
  block: { paddingHorizontal: gutter, marginTop: space.sm },
  card: { marginHorizontal: gutter },
  line: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  totals: { padding: space.lg, gap: space.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  more: { paddingHorizontal: gutter, paddingTop: space.xl, gap: space.xs, alignItems: "center" },
  errorPad: { paddingTop: space.xxl },
});
