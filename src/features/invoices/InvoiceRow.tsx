import { StyleSheet, View } from "react-native";
import { t, type TranslationKey } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Invoice } from "@/types/invoice";
import { Badge } from "@/ui/Badge";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { balanceDue, cents, daysOverdue, STATUS_TONE } from "./invoice";

/** "Due 12 Nov", "4 days overdue", "Paid 3 Nov", "Draft" — the one date that matters for its status. */
export function invoiceWhen(inv: Invoice, locale: string, today: string): string | null {
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
  if (inv.status === "paid" && inv.paid_at) return t("invoice.paidOn", { date: day(inv.paid_at) });
  if (inv.status === "overdue") {
    const n = daysOverdue(inv, today);
    return n === 1 ? t("invoice.overdueOne") : t("invoice.overdueDays", { n });
  }
  if (inv.status === "sent" && inv.due_date) return t("invoice.dueOn", { date: day(inv.due_date) });
  if (inv.status === "void" && inv.voided_at) return t("invoice.voidedOn", { date: day(inv.voided_at) });
  return null;
}

/** One invoice: who it's for and how much, then its status and the date that goes with it. */
export function InvoiceRow({ invoice: inv, locale, today, onOpen }: { invoice: Invoice; locale: string; today: string; onOpen: (inv: Invoice) => void }) {
  const { colors } = useTheme();
  const open = inv.status === "sent" || inv.status === "overdue";
  const amount = open ? balanceDue(inv) : inv.total_cents;
  const when = invoiceWhen(inv, locale, today);
  const label = t(`invoice.status_${inv.status}` as TranslationKey);
  return (
    <PressableScale
      onPress={() => onOpen(inv)}
      scaleTo={0.985}
      accessibilityLabel={[inv.customer_name, inv.number, cents(amount, inv.currency, locale), label, when].filter(Boolean).join(". ")}
      style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.top}>
        <Text variant="callout" weight="semibold" numberOfLines={1} style={styles.flex} tone={inv.status === "void" ? "muted" : "default"}>
          {inv.customer_name || inv.customer_email || t("invoice.noCustomer")}
        </Text>
        <Text variant="headline" numeric tone={inv.status === "void" ? "subtle" : inv.status === "overdue" ? "danger" : "default"} style={inv.status === "void" ? styles.struck : undefined}>
          {cents(amount, inv.currency, locale)}
        </Text>
      </View>
      <View style={styles.meta}>
        <Badge label={label} tone={STATUS_TONE[inv.status]} />
        <Text variant="footnote" tone="muted" numeric numberOfLines={1} style={styles.flex}>
          {[inv.number, when].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  item: { marginHorizontal: gutter, marginBottom: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  meta: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: "line-through" },
});
