import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { useAgencyAction, useAgencyClient } from "@/features/agency/useAgency";
import { t } from "@/i18n";
import type { ClientDetail, ClientProfilePatch } from "@/types/agency";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { Briefcase, UserRound } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { SkeletonList } from "@/ui/Skeleton";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Edit a client's business and owner details (agency admins). The owner's email can change only until they can sign
 * in (the server says so with `email_editable`); a new address gets a fresh invite.
 */
export default function EditClientSheet() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useAgencyClient(id).data;
  if (!detail) {
    return (
      <FormScreen topInset={false} sheetTitle={t("agency.action.edit")}>
        <SkeletonList rows={5} />
      </FormScreen>
    );
  }
  return <EditForm id={id} detail={detail} />;
}

/** The form, started from the loaded client (so nothing is copied into state after the first render). */
function EditForm({ id, detail }: { id: number; detail: ClientDetail }) {
  const [business, setBusiness] = useState(detail.profile.business_name ?? detail.client.business_name ?? "");
  const [website, setWebsite] = useState(detail.profile.website_url ?? "");
  const [industry, setIndustry] = useState(detail.profile.industry ?? "");
  const [owner, setOwner] = useState(detail.owner.name ?? "");
  const [email, setEmail] = useState(detail.owner.email ?? "");
  const [tried, setTried] = useState(false);

  const save = useAgencyAction((agencyId, body: ClientProfilePatch) => agencyApi.updateClient(agencyId, id, body), {
    success: (r) => (r.invite?.invite_sent ? t("agency.done.savedInvite") : t("agency.done.saved")),
    onDone: () => router.back(),
  });

  const emailBad = detail.owner.email_editable && !EMAIL.test(email.trim());
  const submit = () => {
    setTried(true);
    if (!business.trim() || !owner.trim() || emailBad) return;
    const body: ClientProfilePatch = {};
    if (business.trim() !== (detail.profile.business_name ?? "")) body.business_name = business.trim();
    if (website.trim() !== (detail.profile.website_url ?? "")) body.website_url = website.trim() || null;
    if (industry.trim() !== (detail.profile.industry ?? "")) body.industry = industry.trim() || null;
    if (owner.trim() !== (detail.owner.name ?? "")) body.owner_name = owner.trim();
    if (detail.owner.email_editable && email.trim().toLowerCase() !== detail.owner.email.toLowerCase()) body.owner_email = email.trim();
    if (Object.keys(body).length === 0) return router.back();
    save.mutate(body);
  };

  return (
    <>
      <Stack.Screen options={{ title: t("agency.action.edit") }} />
      <FormScreen topInset={false} sheetTitle={t("agency.action.edit")} sticky={<Button label={t("common.save")} size="lg" fullWidth loading={save.isPending} onPress={submit} />}>
        {save.error ? <Banner message={userMessage(save.error)} /> : null}
        <FormSection title={t("agency.form.business")} icon={Briefcase}>
          <Input label={t("agency.form.businessName")} value={business} onChangeText={setBusiness} maxLength={120} error={tried && !business.trim() ? t("agency.form.required") : null} />
          <Input label={t("agency.form.website")} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={300} />
          <Input label={t("agency.form.industry")} value={industry} onChangeText={setIndustry} maxLength={80} />
        </FormSection>
        <FormSection title={t("agency.form.owner")} icon={UserRound}>
          <Input label={t("agency.form.ownerName")} value={owner} onChangeText={setOwner} maxLength={120} error={tried && !owner.trim() ? t("agency.form.required") : null} />
          <Input
            label={t("agency.form.ownerEmail")}
            value={email}
            onChangeText={setEmail}
            editable={detail.owner.email_editable}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint={detail.owner.email_editable ? t("agency.form.emailNewInvite") : t("agency.form.emailLocked")}
            error={tried && emailBad ? t("agency.form.emailInvalid") : null}
          />
        </FormSection>
      </FormScreen>
    </>
  );
}
