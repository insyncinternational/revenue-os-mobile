import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { authApi, isSignedIn } from "@/api/auth";
import { ApiError, userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useAuthFlow } from "@/session/authFlow";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { ICON_STROKE, ShieldCheck } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

export default function TwoFactor() {
  const { colors } = useTheme();
  const toast = useToast();
  const challenge = useAuthFlow((s) => s.challenge);
  const setChallenge = useAuthFlow((s) => s.setChallenge);
  const signIn = useSession((s) => s.signIn);
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState("");

  // Arrived without a challenge (app restored on this screen): start over.
  useEffect(() => {
    if (!challenge) router.replace("/sign-in");
  }, [challenge]);

  const verify = useMutation({
    mutationFn: async (value: string) => {
      const result = await authApi.twoFactor(challenge ?? "", value);
      if (!isSignedIn(result)) throw new ApiError("unknown", 200, t("state.errorMessage"));
      return result;
    },
    onSuccess: async (result) => {
      haptics.success();
      setChallenge(null);
      if (result.used_recovery_code) toast.show(t("auth.recoveryCodeUsed"));
      await signIn(result);
    },
    onError: (e) => {
      haptics.warning();
      setCode("");
      // The challenge expired or too many tries: the password step has to be redone.
      if (e instanceof ApiError && e.code === "TWO_FACTOR_EXPIRED") {
        setChallenge(null);
        toast.show(userMessage(e), { kind: "error" });
      }
    },
  });

  const onChange = (v: string) => {
    if (recovery) {
      setCode(v);
      return;
    }
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    // Six digits from the authenticator: verify straight away, no extra tap.
    if (digits.length === 6 && !verify.isPending) verify.mutate(digits);
  };

  const submit = () => {
    const value = code.trim();
    if (value.length >= 6 && !verify.isPending) verify.mutate(value);
  };

  return (
    <FormScreen topInset={false}>
      <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
        <ShieldCheck size={26} color={colors.primary} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("auth.twoFactorTitle")}
        </Text>
        <Text variant="subhead" tone="muted">
          {recovery ? t("auth.recoverySubtitle") : t("auth.twoFactorSubtitle")}
        </Text>
      </View>

      {verify.error ? <Banner message={userMessage(verify.error)} /> : null}

      {recovery ? (
        <Input
          key="recovery"
          label={t("auth.code")}
          value={code}
          onChangeText={onChange}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      ) : (
        <Input
          key="totp"
          label={t("auth.code")}
          value={code}
          onChangeText={onChange}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          style={styles.codeInput}
          accessibilityHint={t("auth.twoFactorSubtitle")}
        />
      )}

      <Button label={t("auth.verify")} size="lg" fullWidth loading={verify.isPending} disabled={code.trim().length < 6} onPress={submit} />

      <Pressable
        onPress={() => {
          setRecovery((r) => !r);
          setCode("");
          verify.reset();
        }}
        hitSlop={10}
        accessibilityRole="button"
        style={styles.switch}
      >
        <Text variant="subhead" tone="primary" weight="semibold">
          {recovery ? t("auth.useAuthenticator") : t("auth.useRecoveryCode")}
        </Text>
      </Pressable>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  heading: { gap: space.xs },
  codeInput: { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: 10, textAlign: "center" },
  switch: { alignSelf: "center", paddingVertical: space.xs },
});
