import { useState } from "react";
import { Share } from "react-native";
import { router, Stack } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { useAgencyAction } from "@/features/agency/useAgency";
import { t } from "@/i18n";
import type { AgencyMemberRole } from "@/types/agency";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ChoiceTiles } from "@/ui/ChoiceTiles";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { ShieldCheck, UserPlus, Users } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invite someone to the agency team as a member (works only their assigned clients) or an admin (everything). */
export default function TeamInviteSheet() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgencyMemberRole>("agency_user");
  const [tried, setTried] = useState(false);

  const add = useAgencyAction((agencyId, v: { email: string; role: AgencyMemberRole }) => agencyApi.addMember(agencyId, v), {
    success: (r) => (r.invite_sent ? t("agency.done.teamInvited", { email: r.email }) : t("agency.done.linkReady")),
    onDone: (r) => {
      router.back();
      if (!r.invite_sent && r.invite_link) void Share.share({ message: r.invite_link });
    },
  });

  const submit = () => {
    setTried(true);
    if (!EMAIL.test(email.trim())) return;
    add.mutate({ email: email.trim(), role });
  };

  return (
    <>
      <Stack.Screen options={{ title: t("agency.team.invite") }} />
      <FormScreen topInset={false} sheetTitle={t("agency.team.invite")} sticky={<Button label={t("agency.invite.sendInvite")} icon={UserPlus} size="lg" fullWidth loading={add.isPending} onPress={submit} />}>
        {add.error ? <Banner message={userMessage(add.error)} /> : null}
        <FormSection title={t("agency.team.who")} icon={UserPlus}>
          <Input
            label={t("agency.team.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            error={tried && !EMAIL.test(email.trim()) ? t("agency.form.emailInvalid") : null}
          />
        </FormSection>
        <FormSection title={t("agency.team.role")} icon={ShieldCheck}>
          <ChoiceTiles<AgencyMemberRole>
            value={role}
            onChange={setRole}
            choices={[
              { key: "agency_user", label: t("role.agency_user"), icon: Users, tone: "info" },
              { key: "agency_admin", label: t("role.agency_admin"), icon: ShieldCheck, tone: "brand" },
            ]}
          />
          <Text variant="footnote" tone="muted">
            {role === "agency_admin" ? t("agency.team.adminHint") : t("agency.team.memberHint")}
          </Text>
        </FormSection>
      </FormScreen>
    </>
  );
}
