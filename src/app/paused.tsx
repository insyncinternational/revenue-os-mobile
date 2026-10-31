import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { ApiError, userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { Globe, ICON_STROKE, Mail, PauseCircle, Phone, RefreshCw } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** The client account is paused by its agency: say who to contact, and let them check again. */
export default function Paused() {
  const { colors } = useTheme();
  const toast = useToast();
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const signOut = useSession((s) => s.signOut);
  const agency = user?.branding?.agency_name ?? (user?.branding?.source === "agency" ? user.branding.name : null);
  const contact = user?.branding?.agency_contact;

  const check = useMutation({
    mutationFn: () => authApi.me(),
    onSuccess: ({ user: fresh }) => {
      // /auth/me answers even while paused. setUser re-derives the gate from the fresh record, so it opens
      // only once the pause is gone (and lands on "verify email" if that is still pending).
      setUser(fresh);
      if (fresh.branding?.account_paused) toast.show(t("gate.stillPaused"));
    },
    onError: (e) => {
      if (!(e instanceof ApiError && e.kind === "paused")) toast.show(userMessage(e), { kind: "error" });
      else toast.show(t("gate.stillPaused"));
    },
  });

  const website = contact?.website ? (/^https?:\/\//i.test(contact.website) ? contact.website : `https://${contact.website}`) : null;

  return (
    <FormScreen
      footer={
        <Pressable onPress={() => void signOut()} hitSlop={10} accessibilityRole="button" style={styles.center}>
          <Text variant="subhead" tone="muted" weight="medium">
            {t("more.signOut")}
          </Text>
        </Pressable>
      }
    >
      <View style={[styles.icon, { backgroundColor: colors.warningSurface }]}>
        <PauseCircle size={26} color={colors.warning} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("gate.pausedTitle")}
        </Text>
        <Text variant="body" tone="secondary">
          {agency ? t("gate.pausedByAgency", { agency }) : t("gate.pausedGeneric")}
        </Text>
      </View>
      <View style={styles.contacts}>
        {contact?.email ? <Button label={t("gate.emailAgency")} icon={Mail} variant="secondary" onPress={() => void Linking.openURL(`mailto:${contact.email}`)} /> : null}
        {contact?.phone ? <Button label={t("gate.callAgency")} icon={Phone} variant="secondary" onPress={() => void Linking.openURL(`tel:${contact.phone!.replace(/[^\d+]/g, "")}`)} /> : null}
        {website ? <Button label={t("gate.website")} icon={Globe} variant="secondary" onPress={() => void Linking.openURL(website)} /> : null}
      </View>
      <Button label={t("gate.checkAgain")} icon={RefreshCw} size="lg" fullWidth loading={check.isPending} onPress={() => check.mutate()} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  heading: { gap: space.xs },
  contacts: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  center: { alignSelf: "center", paddingVertical: space.xs },
});
