import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { billingProblem } from "@/features/agency/BillingNotice";
import { openBuyCredits } from "@/features/agency/navigate";
import { useAgencyBilling, useAgencyCan, useAgencyId, useAgencyInfo } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { count, money } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ArrowUpCircle, CreditCard, ExternalLink } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * The agency's plan with GrowthReach.ai (admins): status, the credit pool and auto top-up, buy credits, and the Stripe
 * portal for the card and invoices. Choosing or changing the plan stays on the web.
 */
export default function AgencyBillingScreen() {
  const online = useOnline();
  const locale = getIntlLocale();
  const toast = useToast();
  const agencyId = useAgencyId();
  const info = useAgencyInfo().data;
  const billing = useAgencyBilling();
  const canBuy = useAgencyCan("manage_billing");
  const [opening, setOpening] = useState(false);
  const [now] = useState(() => Date.now());
  const b = billing.data;

  const openPortal = async () => {
    setOpening(true);
    try {
      const { url } = await agencyApi.billingPortal(agencyId);
      await WebBrowser.openBrowserAsync(url);
      void billing.refetch();
    } catch (e) {
      toast.show(userMessage(e), { kind: "error" });
    } finally {
      setOpening(false);
    }
  };

  if (!b) {
    return (
      <>
        <Stack.Screen options={{ title: t("agency.billing.title") }} />
        <Screen>
          {billing.isPending ? (
            <DelayedFallback>
              <SkeletonList rows={6} />
            </DelayedFallback>
          ) : (
            <ErrorState offline={!online} message={online ? userMessage(billing.error) : undefined} onRetry={() => void billing.refetch()} />
          )}
        </Screen>
      </>
    );
  }

  const problem = billingProblem(info?.agency, b.billing, now, locale);
  const status = b.billing.on_trial ? t("agency.billing.trial") : b.billing.billing_status === "active" ? t("agency.billing.active") : b.billing.billing_status === "past_due" ? t("agency.billing.pastDue") : b.billing.billing_status === "canceled" ? t("agency.billing.canceled") : t("agency.billing.managed");
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const price = money(b.platform.price_cents_per_1000 / 100, b.platform.currency.toUpperCase(), locale);

  return (
    <>
      <Stack.Screen options={{ title: t("agency.billing.title") }} />
      <Screen onRefresh={() => void billing.refetch()} refreshing={billing.isRefetching}>
        {!online ? <OfflineBanner /> : null}
        {problem ? (
          <View style={styles.pad}>
            <Banner kind={problem.tone} message={`${problem.title}. ${problem.message}`} />
          </View>
        ) : null}

        <SectionHeader title={t("agency.billing.plan")} />
        <Card padded={false} style={styles.card}>
          <ListRow title={b.billing.plan_name} subtitle={b.billing.max_clients != null ? t("agency.billing.upTo", { count: b.billing.max_clients }) : t("agency.billing.unlimited")} trailing={<Badge label={status} tone={problem?.tone === "danger" ? "danger" : "brand"} />} />
          {b.billing.billing_period_end ? (
            <>
              <Divider inset={gutter} />
              <ListRow title={t("agency.billing.renews", { date: day(b.billing.billing_period_end) })} />
            </>
          ) : null}
          {b.billing.on_trial && b.billing.trial_ends_at ? (
            <>
              <Divider inset={gutter} />
              <ListRow title={t("agency.billing.trialEnds", { date: day(b.billing.trial_ends_at) })} />
            </>
          ) : null}
        </Card>

        <SectionHeader title={t("agency.home.pool")} />
        <Card style={styles.card} contentStyle={styles.pool}>
          <View style={styles.flex}>
            <Text variant="metric" numeric>
              {count(b.pool.lead_credits, locale)}
            </Text>
            <Text variant="footnote" tone="muted">
              {t("agency.billing.price", { price })}
            </Text>
          </View>
          {canBuy ? <Button label={t("agency.credits.buy")} icon={ArrowUpCircle} size="sm" onPress={openBuyCredits} /> : null}
        </Card>
        <Card padded={false} style={[styles.card, styles.gapTop]}>
          <ListRow
            title={b.auto_recharge.enabled ? t("agency.billing.autoOn", { threshold: count(b.auto_recharge.threshold, locale), credits: count(b.auto_recharge.credits, locale) }) : t("agency.billing.autoOff")}
            subtitle={b.auto_recharge.last_error ? t("agency.billing.autoError", { error: b.auto_recharge.last_error }) : t("agency.billing.autoHint")}
            subtitleLines={2}
          />
        </Card>

        {b.billing.has_customer && b.viewer.can_manage ? (
          <>
            <SectionHeader title={t("agency.billing.payment")} />
            <Card padded={false} style={styles.card}>
              <ListRow
                title={t("agency.billing.portal")}
                subtitle={t("agency.billing.portalHint")}
                leading={<CreditCard size={20} />}
                trailing={<ExternalLink size={18} />}
                onPress={opening ? undefined : () => void openPortal()}
              />
            </Card>
          </>
        ) : null}
        <Text variant="footnote" tone="muted" align="center" style={styles.hint}>
          {t("agency.billing.webHint")}
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingTop: space.sm },
  card: { marginHorizontal: gutter },
  gapTop: { marginTop: space.sm },
  pool: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1, minWidth: 0 },
  hint: { paddingHorizontal: gutter, paddingVertical: space.xl },
});
