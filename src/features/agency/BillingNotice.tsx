import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { CircleAlert, Clock, ICON_STROKE, ChevronRight } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { openAgencyBilling } from "./navigate";
import { useAgencyBilling, useAgencyInfo, useIsAgencyAdmin } from "./useAgency";

export type BillingProblem = { tone: "danger" | "warning"; title: string; message: string } | null;

/** Pure: the most important thing about the agency's plan right now, if anything needs attention. */
export function billingProblem(
  agency: { status?: string; on_trial?: boolean; trial_ended?: boolean; trial_ends_at?: string | null } | undefined,
  billing: { billing_status: string | null; suspended_by_billing: boolean; billing_grace_ends_at: string | null } | undefined,
  now: number,
  locale: string
): BillingProblem {
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
  if (billing?.suspended_by_billing || agency?.status === "suspended") return { tone: "danger", title: t("agency.bill.onHold"), message: t("agency.bill.onHoldMessage") };
  if (billing?.billing_status === "past_due")
    return { tone: "danger", title: t("agency.bill.pastDue"), message: billing.billing_grace_ends_at ? t("agency.bill.pastDueBy", { date: day(billing.billing_grace_ends_at) }) : t("agency.bill.pastDueMessage") };
  if (agency?.trial_ended) return { tone: "danger", title: t("agency.bill.trialEnded"), message: t("agency.bill.trialEndedMessage") };
  if (billing?.billing_status === "canceled") return { tone: "warning", title: t("agency.bill.canceled"), message: t("agency.bill.canceledMessage") };
  if (agency?.on_trial && agency.trial_ends_at) {
    const days = Math.max(0, Math.ceil((Date.parse(agency.trial_ends_at) - now) / 86_400_000));
    return { tone: "warning", title: days === 1 ? t("agency.bill.trialOneDay") : t("agency.bill.trialDays", { days }), message: t("agency.bill.trialMessage") };
  }
  return null;
}

/** A tappable warning above the agency home when the plan needs attention (admins open Billing from it). */
export function BillingNotice() {
  const { colors } = useTheme();
  const admin = useIsAgencyAdmin();
  const info = useAgencyInfo().data;
  const billing = useAgencyBilling(admin).data;
  const [now] = useState(() => Date.now());
  const problem = billingProblem(info?.agency, billing?.billing, now, getIntlLocale());
  if (!problem) return null;
  const danger = problem.tone === "danger";
  const Icon = danger ? CircleAlert : Clock;
  const fg = danger ? colors.dangerText : colors.warningText;
  return (
    <PressableScale
      onPress={admin ? openAgencyBilling : undefined}
      disabled={!admin}
      accessibilityRole={admin ? "button" : "text"}
      accessibilityLabel={`${problem.title}. ${problem.message}`}
      style={[styles.card, { backgroundColor: danger ? colors.dangerSurface : colors.warningSurface }]}
    >
      <Icon size={20} color={fg} strokeWidth={ICON_STROKE + 0.25} />
      <View style={styles.text}>
        <Text variant="callout" weight="semibold" style={{ color: fg }}>
          {problem.title}
        </Text>
        <Text variant="footnote" style={{ color: fg }}>
          {problem.message}
        </Text>
      </View>
      {admin ? <ChevronRight size={18} color={fg} strokeWidth={ICON_STROKE} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md + 2, borderRadius: radius.xl },
  text: { flex: 1, gap: 2 },
});
