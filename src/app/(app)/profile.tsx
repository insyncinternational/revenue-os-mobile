import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import { getCalendars } from "expo-localization";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/session/sessionStore";
import { space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { Building, Clock, KeyRound, Mail, Trash2, UserRound } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * Edit profile — the web's Settings → Profile on the phone: name, company and time zone (email is how you sign
 * in, so it shows but can't change), password, and asking for the account to be closed.
 */
export default function ProfileScreen() {
  const toast = useToast();
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [company, setCompany] = useState(user?.company ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "");
  const phoneZone = getCalendars()[0]?.timeZone ?? null;
  const dirty = name.trim() !== (user?.name ?? "") || company.trim() !== (user?.company ?? "") || timezone !== (user?.timezone ?? "");

  const save = useMutation({
    mutationFn: () => authApi.updateProfile({ name: name.trim(), company: company.trim(), ...(timezone ? { timezone } : {}) }),
    onSuccess: ({ user: next }) => {
      setUser({ ...user!, ...next });
      haptics.success();
      toast.show(t("profile.saved"), { kind: "success" });
      router.back();
    },
  });

  const deletion = useMutation({
    mutationFn: () => authApi.requestDeletion(),
    onSuccess: () => toast.show(t("profile.deletionSent"), { kind: "success" }),
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });

  const askDeletion = async () => {
    if (await confirm(t("profile.deletionConfirm"), t("profile.deletionSend"), t("common.cancel"), true)) deletion.mutate();
  };

  const shown = name.trim() || user?.email || "?";

  return (
    <>
      <Stack.Screen options={{ title: t("profile.title") }} />
      <FormScreen
        topInset={false}
        sheetTitle={t("profile.title")}
        sticky={<Button label={t("common.save")} size="lg" fullWidth disabled={!dirty || !name.trim()} loading={save.isPending} onPress={() => save.mutate()} />}
      >
        {save.error ? <Banner message={userMessage(save.error)} /> : null}
        <View style={styles.preview}>
          <Avatar name={shown} uri={user?.avatar_url} size={80} accent />
          <Text variant="headline" numberOfLines={1}>
            {shown}
          </Text>
          {company.trim() ? (
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {company.trim()}
            </Text>
          ) : null}
        </View>

        <FormSection title={t("profile.details")} icon={UserRound}>
          <Input label={t("profile.name")} value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" error={!name.trim() && dirty ? t("profile.nameRequired") : null} />
          <Input label={t("profile.company")} icon={Building} placeholder={t("profile.companyPlaceholder")} value={company} onChangeText={setCompany} autoCapitalize="words" />
          <Input label={t("profile.email")} icon={Mail} value={user?.email ?? ""} editable={false} hint={t("profile.emailHint")} />
        </FormSection>

        <FormSection title={t("profile.timezone")} icon={Clock}>
          <Text variant="subhead" weight="medium">
            {timezone || t("profile.timezoneNone")}
          </Text>
          <Text variant="footnote" tone="muted">
            {t("profile.timezoneHint")}
          </Text>
          {phoneZone && phoneZone !== timezone ? <Button label={t("profile.usePhoneZone", { zone: phoneZone })} variant="secondary" size="sm" onPress={() => setTimezone(phoneZone)} /> : null}
        </FormSection>

        <FormSection title={t("profile.security")} icon={KeyRound}>
          <Text variant="footnote" tone="muted">
            {t("profile.passwordHint")}
          </Text>
          <Button label={t("profile.changePassword")} variant="secondary" onPress={() => router.push("/change-password")} />
        </FormSection>

        <FormSection title={t("profile.deleteTitle")} icon={Trash2}>
          <Text variant="footnote" tone="muted">
            {t("profile.deleteHint")}
          </Text>
          <Button label={t("profile.deletionSend")} variant="danger" loading={deletion.isPending} onPress={() => void askDeletion()} />
        </FormSection>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", gap: space.xs, paddingBottom: space.xs },
});
