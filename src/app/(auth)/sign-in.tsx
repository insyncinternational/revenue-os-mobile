import { useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInputInstance } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { authApi, isSignedIn, isTwoFactorRequired } from "@/api/auth";
import { ApiError, userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { looksLikeEmail, useAuthFlow } from "@/session/authFlow";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { Eye, EyeOff, ICON_STROKE, Lock, Mail } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Logo } from "@/ui/Logo";
import { Text } from "@/ui/Text";

export default function SignIn() {
  const { colors } = useTheme();
  const signIn = useSession((s) => s.signIn);
  const endedReason = useSession((s) => s.endedReason);
  const flow = useAuthFlow();
  const [email, setEmail] = useState(flow.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const passwordRef = useRef<TextInputInstance>(null);

  const login = useMutation({
    mutationFn: async () => {
      const result = await authApi.login(email.trim(), password);
      if (!isTwoFactorRequired(result) && !isSignedIn(result)) throw new ApiError("unknown", 200, t("state.errorMessage"));
      return result;
    },
    onSuccess: async (result) => {
      flow.setEmail(email.trim());
      if (isTwoFactorRequired(result)) {
        flow.setChallenge(result.challenge_token);
        setPassword("");
        router.push("/two-factor");
        return;
      }
      haptics.success();
      await signIn(result);
    },
  });

  const submit = () => {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = t("auth.enterEmail");
    else if (!looksLikeEmail(email)) errors.email = t("auth.invalidEmail");
    if (!password) errors.password = t("auth.enterPassword");
    setFieldErrors(errors);
    if (errors.email || errors.password || login.isPending) return;
    login.mutate();
  };

  const notice =
    login.error != null
      ? userMessage(login.error)
      : endedReason === "suspended"
        ? t("error.suspended")
        : endedReason === "unauthorized"
          ? t("error.sessionEnded")
          : null;

  return (
    <FormScreen
      footer={
        <Text variant="footnote" tone="muted" align="center">
          {t("auth.noAccount")}
        </Text>
      }
    >
      <View style={styles.logo}>
        <Logo height={44} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("auth.signInTitle")}
        </Text>
        <Text variant="subhead" tone="muted">
          {t("auth.signInSubtitle")}
        </Text>
      </View>

      {notice ? <Banner message={notice} kind={login.error ? "danger" : "warning"} /> : null}

      <Input
        label={t("auth.email")}
        placeholder={t("auth.emailPlaceholder")}
        icon={Mail}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
        }}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Input
        ref={passwordRef}
        label={t("auth.password")}
        icon={Lock}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
        }}
        error={fieldErrors.password}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        trailing={
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {showPassword ? <EyeOff size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} /> : <Eye size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} />}
          </Pressable>
        }
      />

      <Pressable onPress={() => router.push("/forgot-password")} hitSlop={10} accessibilityRole="link" accessibilityLabel={t("auth.forgotPassword")} style={styles.forgot}>
        <Text variant="subhead" tone="primary" weight="semibold">
          {t("auth.forgotPassword")}
        </Text>
      </Pressable>

      <Button label={t("auth.signIn")} size="lg" fullWidth loading={login.isPending} onPress={submit} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: "flex-start", marginBottom: space.lg },
  heading: { gap: space.xs },
  forgot: { alignSelf: "flex-end", marginTop: -space.xs },
});
