import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { invoicePdfUrl } from "@/api/invoices";
import { userMessage } from "@/api/errors";
import { balanceDue, cents, invoiceActions, invoiceSteps, STATUS_TONE, type InvoiceStep } from "@/features/invoices/invoice";
import { invoiceWhen } from "@/features/invoices/InvoiceRow";
import { sharePayLink } from "@/features/invoices/sharePayLink";
import { useInvoice, useInvoiceAction, usePayments } from "@/features/invoices/useInvoices";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { openContact, openDeal } from "@/lib/navigate";
import { dayKey } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Invoice } from "@/types/invoice";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import { Badge } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { ActionTiles, type TileAction as BarAction } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ContrastBlock } from "@/ui/ContrastBlock";
import { Ban, CheckCircle2, ChevronRight, ExternalLink, FileText, ICON_STROKE, KanbanSquare, Mail, Send, Share2, UserRound, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Ring } from "@/ui/Ring";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** How many steps get a round button on the bar (after the main one); the rest are links under the content. */
const ROUND = 3;

/**
 * How much and who for (a dark block with a paid ring), the lines as a receipt, and the next step for its status
 * pinned at the bottom (send, share the pay link, mark paid…).
 */
export default function InvoiceScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const headerStyle = useAreaHeaderStyle("invoices");
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
        <Stack.Screen options={{ title: "", headerStyle }} />
        <Screen>
          {query.isPending ? (
            <DelayedFallback>
              <View style={styles.hero}>
                <Backdrop area="invoices" underBar />
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
  const pdf = invoicePdfUrl(inv);
  // How much of it is paid, as a ring (not for drafts or void ones, where it means nothing).
  const paid = inv.total_cents > 0 && inv.status !== "draft" && inv.status !== "void" ? Math.min(1, inv.amount_paid_cents / inv.total_cents) : null;

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

  const glyph = (Icon: IconComponent, color: string) => <Icon size={21} color={color} strokeWidth={ICON_STROKE + 0.25} />;
  const STEPS: Record<InvoiceStep, BarAction & { danger?: boolean }> = {
    sendEmail: { key: "sendEmail", label: t("invoice.sendEmail"), icon: Send, run: () => action.mutate({ kind: "email" }) },
    shareLink: { key: "shareLink", label: t("invoice.shareLink"), icon: Share2, run: () => void share(inv) },
    markPaid: { key: "markPaid", label: t("invoice.markPaid"), icon: CheckCircle2, glyph: glyph(CheckCircle2, colors.success), run: () => void markPaid() },
    emailAgain: { key: "emailAgain", label: t("invoice.emailAgain"), icon: Mail, run: () => action.mutate({ kind: "email" }) },
    pdf: { key: "pdf", label: t("invoice.openPdf"), icon: FileText, run: () => pdf && void Linking.openURL(pdf) },
    viewAsCustomer: { key: "viewAsCustomer", label: t("invoice.viewAsCustomer"), icon: ExternalLink, run: () => void Linking.openURL(inv.pay_url) },
    void: { key: "void", label: t("invoice.void"), icon: Ban, glyph: glyph(Ban, colors.danger), run: () => void voidIt(), danger: true },
  };
  const steps = invoiceSteps(inv, { canEdit, stripeReady: !stripeMissing, hasPdf: Boolean(pdf) }).map((k) => STEPS[k]);
  // Never a destructive main button: with only Void left (a draft without Stripe), there's no bar, just the link.
  const first = steps[0] && !steps[0].danger ? steps[0] : null;
  const others = first ? steps.slice(1) : steps;
  const main = first ? { ...first, glyph: undefined } : null;
  const round = first ? others.slice(0, ROUND) : [];
  const links = first ? others.slice(ROUND) : others;

  return (
    <>
      <Stack.Screen options={{ title: inv.number, headerStyle }} />
      <Screen
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
      >
        <View style={styles.hero}>
          <Backdrop area="invoices" underBar />
          {/* The amount is the one highlight: a dark block with the status, who it's for and how much is paid. */}
          <ContrastBlock>
            <View style={styles.badgeRow}>
              <Badge label={t(`invoice.status_${inv.status}` as TranslationKey)} tone={STATUS_TONE[inv.status]} dot={inv.status === "overdue"} />
              {when ? (
                <Text variant="footnote" weight={inv.status === "overdue" ? "semibold" : undefined} style={{ color: inv.status === "overdue" ? colors.onHero : colors.onHeroMuted }}>
                  {when}
                </Text>
              ) : null}
            </View>
            <View style={styles.amountRow}>
              <View style={styles.flex}>
                <Text variant="footnote" style={{ color: colors.onHeroMuted }}>
                  {open ? t("invoice.balanceDue") : t("invoice.total")}
                </Text>
                {/* Counts up on open (cents are whole numbers, so it settles on the exact amount). */}
                <AnimatedNumber value={amount} format={(n) => cents(Math.round(n), inv.currency, locale)} variant="display" numberOfLines={1} adjustsFontSizeToFit style={[{ color: colors.onHero }, inv.status === "void" ? styles.struck : null]} />
                <Text variant="callout" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
                  {[inv.customer_name, inv.customer_email].filter(Boolean).join(" · ") || t("invoice.noCustomer")}
                </Text>
              </View>
              {paid != null ? (
                <View style={styles.ring} accessible accessibilityLabel={`${t("invoice.paid")}: ${Math.round(paid * 100)}%`}>
                  <Ring value={paid} size={64} stroke={6} color={colors.onHero} track={colors.heroGlass}>
                    <Text variant="caption" weight="semibold" numeric style={{ color: colors.onHero }}>{`${Math.round(paid * 100)}%`}</Text>
                  </Ring>
                  <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                    {t("invoice.paid")}
                  </Text>
                </View>
              ) : null}
            </View>
          </ContrastBlock>
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

        {/* The next steps as tiles in the page (never a destructive one first). */}
        {main ? <ActionTiles actions={[main, ...round]} style={styles.tiles} /> : null}

        <Reveal index={0}>
          <SectionHeader title={t("invoice.items")} />
          {/* A receipt: the lines, a dashed tear line, then the totals. */}
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
            <Dashes />
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

        {links.length > 0 ? (
          <Reveal index={3}>
            <View style={styles.more}>
              {links.map((l) => (
                <Button key={l.key} label={l.label} icon={l.icon} variant={l.danger ? "danger" : "ghost"} onPress={l.run} />
              ))}
            </View>
          </Reveal>
        ) : null}
      </Screen>
    </>
  );
}

/** The receipt's tear line: a row of short dashes (dashed single-side borders don't draw on every platform). */
function Dashes() {
  const { colors } = useTheme();
  return (
    <View style={styles.dashes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 48 }, (_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: colors.borderStrong }]} />
      ))}
    </View>
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
  tiles: { marginTop: space.lg, marginBottom: space.xs },
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.md },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  amountRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  ring: { alignItems: "center", gap: space.xs },
  struck: { textDecorationLine: "line-through" },
  block: { paddingHorizontal: gutter, marginTop: space.sm },
  card: { marginHorizontal: gutter },
  line: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  dashes: { flexDirection: "row", overflow: "hidden", gap: 5, marginHorizontal: space.lg },
  dash: { width: 7, height: 1.5, borderRadius: 1 },
  totals: { padding: space.lg, gap: space.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  more: { paddingHorizontal: gutter, paddingTop: space.xl, gap: space.xs, alignItems: "center" },
  errorPad: { paddingTop: space.xxl },
});
