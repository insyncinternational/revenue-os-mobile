import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { useAgencyAction, useAgencyId, useClientInvites } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { gutter, space } from "@/theme/tokens";
import type { ClientInvite } from "@/types/agency";
import { Badge } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { Link, Mail, Share2 } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { ListRow } from "@/ui/ListRow";
import { Divider, SectionHeader } from "@/ui/Section";
import { useToast } from "@/ui/Toast";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pure: whether a sign-up link still works. */
export function inviteUsable(i: ClientInvite, now = Date.now()): boolean {
  if (i.revoked || !i.usable) return false;
  if (i.expires_at && Date.parse(i.expires_at) <= now) return false;
  return true;
}

/**
 * Invite a client to sign up: a link for one person (emailed to them too) or a link anyone can use. Either way the
 * phone's share sheet sends it by WhatsApp, SMS or anything else.
 */
export default function InviteClientSheet() {
  const locale = getIntlLocale();
  const toast = useToast();
  const agencyId = useAgencyId();
  const invites = useClientInvites();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);

  const share = (url: string) => void Share.share({ message: t("agency.invite.shareMessage", { url }) });

  const create = useAgencyAction((id, v: { email: string | null }) => agencyApi.createClientInvite(id, { email: v.email, send_email: Boolean(v.email) }), {
    success: (r, v) => (v.email ? (r.email_sent ? t("agency.done.inviteEmailed", { email: v.email }) : t("agency.done.linkReady")) : t("agency.done.linkReady")),
    onDone: (r) => {
      setEmail("");
      setTried(false);
      share(r.url);
    },
  });

  const reshare = async (i: ClientInvite) => {
    try {
      const { url } = await agencyApi.clientInviteUrl(agencyId, i.id);
      share(url);
    } catch (e) {
      toast.show(userMessage(e), { kind: "error" });
    }
  };

  const personal = () => {
    setTried(true);
    if (!EMAIL.test(email.trim())) return;
    create.mutate({ email: email.trim() });
  };

  const live = (invites.data?.invites ?? []).filter((i) => inviteUsable(i) && i.can_copy !== false).slice(0, 10);

  return (
    <>
      <Stack.Screen options={{ title: t("agency.quick.invite") }} />
      <FormScreen topInset={false} sheetTitle={t("agency.quick.invite")}>
        {create.error ? <Banner message={userMessage(create.error)} /> : null}
        <FormSection title={t("agency.invite.personal")} icon={Mail}>
          <Input
            label={t("agency.form.ownerEmail")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint={t("agency.invite.personalHint")}
            error={tried && !EMAIL.test(email.trim()) ? t("agency.form.emailInvalid") : null}
          />
          <Button label={t("agency.invite.sendInvite")} icon={Mail} loading={create.isPending && create.variables?.email != null} onPress={personal} />
        </FormSection>
        <FormSection title={t("agency.invite.shareable")} icon={Link}>
          <Button label={t("agency.invite.makeLink")} icon={Share2} variant="secondary" loading={create.isPending && create.variables?.email == null} onPress={() => create.mutate({ email: null })} />
        </FormSection>
        {live.length > 0 ? (
          <View>
            <SectionHeader title={t("agency.invite.active")} />
            <Card padded={false}>
              {live.map((i, n) => (
                <View key={i.id}>
                  {n > 0 ? <Divider inset={gutter} /> : null}
                  <ListRow
                    title={i.email || i.label || t("agency.invite.anyone")}
                    subtitle={[i.kind === "personal" ? t("agency.invite.forOne") : t("agency.invite.usedTimes", { count: i.uses }), i.created_at ? relativeTime(i.created_at, locale) : null].filter(Boolean).join(" · ")}
                    trailing={<Badge label={t("agency.invite.share")} tone="brand" />}
                    onPress={() => void reshare(i)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ) : null}
        <View style={styles.gap} />
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({ gap: { height: space.lg } });
