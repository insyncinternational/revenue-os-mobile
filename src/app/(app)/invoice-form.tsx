import { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ApiError, userMessage } from "@/api/errors";
import { fullName } from "@/features/contacts/contact";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { useContact } from "@/features/contacts/useContacts";
import { cents } from "@/features/invoices/invoice";
import { dueDateIn, looksLikeEmail, MAX_LINES, MAX_TOTAL_CENTS, parseLines, parseTaxBps, totals, type DraftLine } from "@/features/invoices/draft";
import { sharePayLink } from "@/features/invoices/sharePayLink";
import { useCreateInvoice, useInvoiceList, usePayments } from "@/features/invoices/useInvoices";
import { getIntlLocale, t } from "@/i18n";
import { openInvoice } from "@/lib/navigate";
import { dayKey } from "@/lib/when";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { FormScreen } from "@/ui/FormScreen";
import { IconButton } from "@/ui/IconButton";
import { CalendarClock, FileText, Plus, Share2, UserRound, X } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";
import { FormSection } from "@/ui/FormSection";

const DUE: { key: string; days: number | null }[] = [
  { key: "dueOnReceipt", days: null },
  { key: "due7", days: 7 },
  { key: "due14", days: 14 },
  { key: "due30", days: 30 },
];

/**
 * A quick invoice from the phone: who for, what for, how much — then save it as a draft or send its pay link straight
 * away through the share sheet (text-to-pay). Products, discounts and editing drafts stay on the web.
 */
export default function InvoiceForm() {
  const params = useLocalSearchParams<{ leadId?: string }>();
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const toast = useToast();
  const create = useCreateInvoice();
  const payments = usePayments().data;
  const recent = useInvoiceList(null).data?.invoices[0]?.currency;
  const presetLead = useContact(Number(params.leadId) || 0).contact.data;
  const nextKey = useRef(1);

  // The workspace's Stripe currency (as on the web), else the last invoice's, else USD — until the user types one.
  const [typedCurrency, setCurrency] = useState<string | null>(null);
  const currency = typedCurrency ?? (payments?.default_currency || recent || "usd").toLowerCase();
  const [leadId, setLeadId] = useState<number | null>(() => Number(params.leadId) || null);
  const [leadLabel, setLeadLabel] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ key: "l0", name: "", quantity: "1", price: "" }]);
  const [tax, setTax] = useState("");
  const [dueDays, setDueDays] = useState<number | null>(7);
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const shownLead = leadLabel ?? (presetLead && leadId === presetLead.id ? fullName(presetLead) : null);
  const leadEmail = presetLead && leadId === presetLead.id ? presetLead.email : null;
  const cur = /^[a-z]{3}$/.test(currency) ? currency : "usd";
  const parsed = useMemo(() => parseLines(lines, cur), [lines, cur]);
  const taxBps = parseTaxBps(tax);
  const sum = totals(parsed.lines, taxBps ?? 0);
  const canLink = payments?.charges_enabled === true;

  const problem = (() => {
    if (!/^[a-z]{3}$/.test(currency)) return t("invoiceForm.badCurrency");
    if (parsed.bad.size) return t("invoiceForm.badLine");
    if (!parsed.lines.length || sum.total <= 0) return t("invoiceForm.needLine");
    if (sum.total > MAX_TOTAL_CENTS) return t("invoiceForm.tooMuch");
    if (taxBps == null) return t("invoiceForm.badTax");
    if (email.trim() && !looksLikeEmail(email)) return t("invoiceForm.badEmail");
    return null;
  })();

  const setLine = (key: string, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) =>
      ls.length >= MAX_LINES
        ? ls
        : [
            ...ls,
            {
              key: `l${nextKey.current++}`,
              name: "",
              quantity: "1",
              price: "",
            },
          ],
    );
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  const submit = (then: "draft" | "link") => {
    if (problem) {
      setShowErrors(true);
      return;
    }
    create.mutate(
      {
        then,
        input: {
          lead_id: leadId,
          currency: cur,
          tax_rate_bps: taxBps ?? 0,
          // Empty → the server takes them from the contact.
          customer_name: name.trim() || null,
          customer_email: email.trim() || null,
          notes: notes.trim() || null,
          due_date: dueDateIn(dayKey(new Date()), dueDays),
          items: parsed.lines,
        },
      },
      {
        onSuccess: async ({ invoice, sendError }) => {
          router.back();
          setTimeout(() => openInvoice(invoice.id), 250);
          if (sendError) toast.show(t("invoiceForm.savedNotSent", { reason: userMessage(sendError) }), { kind: "error" });
          else if (then === "link") await sharePayLink(invoice, locale, toast);
          else toast.show(t("invoiceForm.saved"), { kind: "success" });
        },
      },
    );
  };

  const serverError =
    create.error instanceof ApiError && create.error.fieldErrors[0] ? create.error.fieldErrors[0].message : create.error ? userMessage(create.error) : null;

  return (
    <>
      <Stack.Screen options={{ title: t("invoiceForm.title") }} />
      <FormScreen
        topInset={false}
        sheetTitle={t("invoiceForm.title")}
        sticky={
          <View style={styles.pinned}>
            <View style={[styles.total]}>
              {sum.tax > 0 ? (
                <Text variant="footnote" tone="muted" numeric>
                  {t("invoiceForm.subtotalTax", {
                    subtotal: cents(sum.subtotal, cur, locale),
                    tax: cents(sum.tax, cur, locale),
                  })}
                </Text>
              ) : null}
              <View style={styles.totalRow}>
                <Text variant="callout" weight="semibold">
                  {t("invoice.total")}
                </Text>
                <Text variant="title" numeric>
                  {cents(sum.total, cur, locale)}
                </Text>
              </View>
            </View>
            <View style={styles.buttons}>
              {canLink ? (
                <Button
                  label={t("invoiceForm.createShare")}
                  icon={Share2}
                  size="lg"
                  fullWidth
                  loading={create.isPending && create.variables?.then === "link"}
                  disabled={create.isPending}
                  onPress={() => submit("link")}
                />
              ) : null}
              <Button
                label={t("invoiceForm.saveDraft")}
                variant={canLink ? "secondary" : "primary"}
                size="lg"
                fullWidth
                loading={create.isPending && create.variables?.then === "draft"}
                disabled={create.isPending}
                onPress={() => submit("draft")}
              />
            </View>
          </View>
        }
      >
        {serverError ? <Banner message={serverError} /> : null}

        <FormSection title={t("invoiceForm.customer")} icon={UserRound}>
          <ContactPicker
            picked={leadId ? shownLead : null}
            onPick={(c) => {
              setLeadId(c.id);
              setLeadLabel(fullName(c));
            }}
            onClear={() => {
              setLeadId(null);
              setLeadLabel(null);
            }}
          />
          {leadId ? null : (
            <Input label={t("invoiceForm.name")} placeholder={t("invoiceForm.namePlaceholder")} value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <Input
            label={t("invoiceForm.email")}
            placeholder={leadId ? leadEmail || t("invoiceForm.emailFromContact") : "name@company.com"}
            hint={leadId ? t("invoiceForm.emailHint") : undefined}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={showErrors && email.trim() && !looksLikeEmail(email) ? t("invoiceForm.badEmail") : null}
          />
        </FormSection>

        <FormSection title={t("invoiceForm.items")} icon={FileText}>
          <View style={styles.lines}>
            {lines.map((l, i) => {
              const bad = showErrors && parsed.bad.has(l.key);
              return (
                <View key={l.key} style={[styles.line, { borderColor: bad ? colors.danger : colors.border }]}>
                  <View style={styles.lineTop}>
                    <View style={styles.flex}>
                      <Input
                        placeholder={t("invoiceForm.itemPlaceholder")}
                        value={l.name}
                        onChangeText={(v) => setLine(l.key, { name: v })}
                        autoCapitalize="sentences"
                      />
                    </View>
                    {lines.length > 1 ? <IconButton icon={X} label={t("invoiceForm.removeItem")} onPress={() => removeLine(l.key)} /> : null}
                  </View>
                  <View style={styles.lineBottom}>
                    <View style={styles.qty}>
                      <Input label={t("invoiceForm.qty")} value={l.quantity} onChangeText={(v) => setLine(l.key, { quantity: v })} keyboardType="decimal-pad" />
                    </View>
                    <View style={styles.flex}>
                      <Input
                        label={`${t("invoiceForm.price")} (${cur.toUpperCase()})`}
                        placeholder="0"
                        value={l.price}
                        onChangeText={(v) => setLine(l.key, { price: v })}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            <Button label={t("invoiceForm.addItem")} icon={Plus} variant="ghost" size="sm" onPress={addLine} disabled={lines.length >= MAX_LINES} />
          </View>
        </FormSection>

        <FormSection title={t("invoiceForm.sectionDetails")} icon={CalendarClock}>
          <View style={styles.row}>
            <View style={styles.qty}>
              <Input
                label={t("invoiceForm.currency")}
                value={currency.toUpperCase()}
                onChangeText={(v) =>
                  setCurrency(
                    v
                      .toLowerCase()
                      .replace(/[^a-z]/g, "")
                      .slice(0, 3),
                  )
                }
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label={t("invoiceForm.tax")}
                placeholder="0"
                value={tax}
                onChangeText={setTax}
                keyboardType="decimal-pad"
                error={showErrors && taxBps == null ? t("invoiceForm.badTax") : null}
              />
            </View>
          </View>

          <Field label={t("invoiceForm.due")}>
            <View style={styles.wrap}>
              {DUE.map((d) => (
                <Chip key={d.key} label={t(`invoiceForm.${d.key}` as "invoiceForm.due7")} selected={dueDays === d.days} onPress={() => setDueDays(d.days)} />
              ))}
            </View>
          </Field>

          <Input
            label={t("invoiceForm.notes")}
            placeholder={t("invoiceForm.notesPlaceholder")}
            value={notes}
            onChangeText={setNotes}
            multiline
            style={styles.notes}
          />
        </FormSection>

        {showErrors && problem ? <Banner kind="warning" message={problem} /> : null}
        {payments && !canLink ? <Banner kind="info" message={t("invoiceForm.connectStripe")} /> : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  lines: { gap: space.sm },
  line: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
  },
  lineTop: { flexDirection: "row", alignItems: "center", gap: space.xs },
  lineBottom: { flexDirection: "row", gap: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  qty: { width: 96 },
  flex: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  notes: { minHeight: 72, textAlignVertical: "top" },
  total: { gap: 2 },
  pinned: { gap: space.md },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttons: { gap: space.sm },
});
