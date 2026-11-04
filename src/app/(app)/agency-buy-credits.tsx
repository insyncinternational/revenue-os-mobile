import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { BUY_MAX, BUY_OPTIONS, BUY_STEP, creditsPrice, newRequestKey, parseCredits } from "@/features/agency/agency";
import { useAgencyAction, useAgencyBilling } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { count, money } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useCelebrate } from "@/ui/Celebrate";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { Coins, CreditCard } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { PressableScale } from "@/ui/PressableScale";
import { SkeletonList } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";

/**
 * Buy lead credits for the pool, charged now to the card on file at the platform price, after one "Charge X?"
 * confirm. One request key per purchase: tapping twice, or a retry after a dropped connection, never charges twice.
 */
export default function BuyCreditsSheet() {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const celebrate = useCelebrate();
  const billing = useAgencyBilling().data;
  const [picked, setPicked] = useState<number>(BUY_OPTIONS[1]);
  const [custom, setCustom] = useState("");
  const requestKey = useRef(newRequestKey());

  const customN = custom.trim() ? parseCredits(custom) : null;
  const credits = custom.trim() ? customN : picked;
  const valid = credits != null && credits >= BUY_STEP && credits <= BUY_MAX && credits % BUY_STEP === 0;
  const currency = billing?.platform.currency.toUpperCase() ?? "AED";
  const price = (n: number) => money(creditsPrice(n, billing?.platform.price_cents_per_1000 ?? 0) / 100, currency, locale);

  const buy = useAgencyAction((agencyId, n: number) => agencyApi.buyCredits(agencyId, { credits: n, request_key: requestKey.current }), {
    success: (r) => t("agency.done.bought", { count: count(r.credits, locale) }),
    onDone: () => {
      celebrate();
      router.back();
    },
  });

  if (!billing) {
    return (
      <FormScreen topInset={false} sheetTitle={t("agency.credits.buy")}>
        <SkeletonList rows={4} />
      </FormScreen>
    );
  }

  const noCard = !billing.auto_recharge.has_card;
  const submit = async () => {
    if (!valid || credits == null) return;
    if (await confirm(t("agency.buy.confirm", { amount: price(credits), count: count(credits, locale) }), t("agency.buy.charge"), t("common.cancel"))) buy.mutate(credits);
  };

  return (
    <>
      <Stack.Screen options={{ title: t("agency.credits.buy") }} />
      <FormScreen
        topInset={false}
        sheetTitle={t("agency.credits.buy")}
        sticky={<Button label={valid && credits ? t("agency.buy.button", { amount: price(credits) }) : t("agency.credits.buy")} icon={CreditCard} size="lg" fullWidth disabled={!valid || noCard} loading={buy.isPending} onPress={() => void submit()} />}
      >
        {noCard ? <Banner kind="warning" message={t("agency.buy.noCard")} /> : null}
        {buy.error ? <Banner message={userMessage(buy.error)} /> : null}
        <FormSection title={t("agency.buy.how")} icon={Coins}>
          <View style={styles.grid}>
            {BUY_OPTIONS.map((n) => {
              const on = !custom.trim() && picked === n;
              return (
                <PressableScale
                  key={n}
                  onPress={() => {
                    setCustom("");
                    setPicked(n);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${count(n, locale)}, ${price(n)}`}
                  style={[styles.option, { backgroundColor: on ? colors.primarySubtle : colors.surfaceSecondary, borderColor: on ? colors.primary : "transparent" }]}
                >
                  <Text variant="headline" numeric style={{ color: on ? colors.primaryText : colors.text }}>
                    {count(n, locale)}
                  </Text>
                  <Text variant="footnote" tone="muted" numeric>
                    {price(n)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Input
            label={t("agency.buy.other")}
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            hint={t("agency.buy.rule")}
            error={custom.trim() && !valid ? t("agency.buy.rule") : null}
          />
        </FormSection>
        <Text variant="footnote" tone="muted">
          {t("agency.buy.poolNow", { count: count(billing.pool.lead_credits, locale) })}
        </Text>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  option: { flexBasis: "47%", flexGrow: 1, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, gap: 2 },
});
