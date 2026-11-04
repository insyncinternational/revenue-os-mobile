import { useState } from "react";
import { Share } from "react-native";
import { router, Stack } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { parseCredits } from "@/features/agency/agency";
import { openAgencyClient } from "@/features/agency/navigate";
import { useAgencyAction, useAgencyCan, useAgencyDashboard } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { count } from "@/lib/format";
import type { NewClientBody } from "@/types/agency";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { Briefcase, Sparkles, UserPlus, UserRound } from "@/ui/icons";
import { Input } from "@/ui/Input";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Add a client: the business and its owner (who gets an email invite to set a password), optionally with starting
 * credits from the pool. Snapshots and modules are set up on the web.
 */
export default function NewClientSheet() {
  const locale = getIntlLocale();
  const canCredits = useAgencyCan("manage_credits");
  const pool = useAgencyDashboard().data?.totals.lead_credits;
  const [business, setBusiness] = useState("");
  const [owner, setOwner] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [credits, setCredits] = useState("");
  const [tried, setTried] = useState(false);
  const creditsN = credits.trim() ? parseCredits(credits) : 0;
  const creditsBad = creditsN == null || (pool != null && (creditsN ?? 0) > pool);

  const create = useAgencyAction((agencyId, body: NewClientBody) => agencyApi.createClient(agencyId, body), {
    success: (r) => (r.invite_sent ? t("agency.done.clientInvited", { email: email.trim() }) : t("agency.done.clientAdded")),
    onDone: (r) => {
      router.back();
      openAgencyClient(r.client.id);
      // The email didn't go out (no mail set up locally, say): offer the link to send another way.
      if (!r.invite_sent && r.invite_link) void Share.share({ message: r.invite_link });
    },
  });

  const submit = () => {
    setTried(true);
    if (!business.trim() || !owner.trim() || !EMAIL.test(email.trim()) || creditsBad) return;
    create.mutate({
      business_name: business.trim(),
      owner_name: owner.trim(),
      owner_email: email.trim(),
      website_url: website.trim() || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      ...(creditsN ? { lead_credits: creditsN } : {}),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: t("agency.quick.addClient") }} />
      <FormScreen
        topInset={false}
        sheetTitle={t("agency.quick.addClient")}
        sticky={<Button label={t("agency.form.addAndInvite")} icon={UserPlus} size="lg" fullWidth loading={create.isPending} onPress={submit} />}
      >
        {create.error ? <Banner message={userMessage(create.error)} /> : null}
        <FormSection title={t("agency.form.business")} icon={Briefcase}>
          <Input label={t("agency.form.businessName")} value={business} onChangeText={setBusiness} maxLength={120} error={tried && !business.trim() ? t("agency.form.required") : null} />
          <Input label={t("agency.form.website")} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={300} />
        </FormSection>
        <FormSection title={t("agency.form.owner")} icon={UserRound}>
          <Input label={t("agency.form.ownerName")} value={owner} onChangeText={setOwner} maxLength={120} textContentType="name" error={tried && !owner.trim() ? t("agency.form.required") : null} />
          <Input
            label={t("agency.form.ownerEmail")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            hint={t("agency.form.inviteHint")}
            error={tried && !EMAIL.test(email.trim()) ? t("agency.form.emailInvalid") : null}
          />
        </FormSection>
        {canCredits ? (
          <FormSection title={t("agency.form.startCredits")} icon={Sparkles}>
            <Input
              label={t("agency.credits.leadCredits")}
              value={credits}
              onChangeText={setCredits}
              keyboardType="number-pad"
              hint={pool != null ? t("agency.credits.poolHas", { count: count(pool, locale) }) : undefined}
              error={tried && creditsBad ? t("agency.credits.moreThanPool") : null}
            />
          </FormSection>
        ) : null}
        <Banner kind="info" message={t("agency.form.webSetup")} />
      </FormScreen>
    </>
  );
}
