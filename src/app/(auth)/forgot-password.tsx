import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { looksLikeEmail, useAuthFlow } from "@/session/authFlow";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { ICON_STROKE, Mail } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const remembered = useAuthFlow((s) => s.email);
  const [email, setEmail] = useState(remembered);
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({ mutationFn: () => authApi.requestPasswordReset(email.trim()) });

  const submit = () => {
    if (!looksLikeEmail(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    setError(null);
    if (!send.isPending) send.mutate();
  };

  if (send.isSuccess) {
    return (
      <FormScreen topInset={false}>
        <View style={[styles.icon, { backgroundColor: colors.successSurface }]}>
          <Mail size={26} color={colors.success} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.heading}>
          <Text variant="title" accessibilityRole="header">
            {t("auth.resetSentTitle")}
          </Text>
          <Text variant="body" tone="secondary">
            {t("auth.resetSentMessage", { email: email.trim() })}
          </Text>
        </View>
        <Button label={t("auth.backToSignIn")} variant="secondary" size="lg" fullWidth onPress={() => router.back()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen topInset={false}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("auth.resetTitle")}
        </Text>
        <Text variant="subhead" tone="muted">
          {t("auth.resetSubtitle")}
        </Text>
      </View>
      {send.error ? <Banner message={userMessage(send.error)} /> : null}
      <Input
        label={t("auth.email")}
        placeholder={t("auth.emailPlaceholder")}
        icon={Mail}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        error={error}
        autoFocus={!remembered}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button label={t("auth.sendResetLink")} size="lg" fullWidth loading={send.isPending} onPress={submit} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  heading: { gap: space.xs },
});
