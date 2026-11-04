import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { portalAuthApi } from "@/api/portal";
import { ApiError, userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { looksLikeEmail } from "@/session/authFlow";
import { usePortalSession } from "./portalSession";
import { normalizeBusinessCode } from "./portal";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { PortalBranding } from "@/types/portal";
import { Avatar } from "@/ui/Avatar";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { Building, ICON_STROKE, KeyRound, Mail } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";

type Step = "business" | "email" | "code" | "password";

/**
 * Sign in as a customer of a business: its code (on the invite email, or from the business), then a 6-digit code
 * emailed to them — or their portal password if they set one. One app, one more door: staff sign in on the
 * screen before this one.
 */
export function CustomerSignInForm({ initialBusiness, onSignedIn }: { initialBusiness?: string; onSignedIn?: () => void }) {
  const { colors } = useTheme();
  const params = { business: initialBusiness };
  const signIn = usePortalSession((s) => s.signIn);
  const [step, setStep] = useState<Step>(params.business ? "email" : "business");
  const [code, setCode] = useState(params.business ?? "");
  const [business, setBusiness] = useState<PortalBranding | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const slug = normalizeBusinessCode(code);

  const find = useMutation({
    mutationFn: () => portalAuthApi.branding(slug),
    onSuccess: (r) => {
      setBusiness(r.portal);
      setError(null);
      setStep("email");
    },
    onError: (e) => setError(e instanceof ApiError && (e.status === 404 || e.status === 403) ? t("portal.signIn.noBusiness") : userMessage(e)),
  });

  const sendCode = useMutation({
    mutationFn: () => portalAuthApi.requestCode(slug, email.trim()),
    onSuccess: () => {
      setError(null);
      setOtp("");
      setStep("code");
    },
    onError: (e) => setError(userMessage(e)),
  });

  const verify = useMutation({
    mutationFn: () => (step === "password" ? portalAuthApi.login(slug, email.trim(), password) : portalAuthApi.verifyCode(slug, email.trim(), otp.trim())),
    onSuccess: async (r) => {
      haptics.success();
      // The root layout sees the session and opens the customer home.
      await signIn(slug, { ...r, branding: r.branding ?? business });
      onSignedIn?.();
    },
    onError: (e) =>
      setError(
        e instanceof ApiError && (e.status === 400 || e.status === 401)
          ? step === "password"
            ? t("portal.signIn.wrongPassword")
            : t("portal.signIn.wrongCode")
          : userMessage(e)
      ),
  });

  const name = business?.business_name ?? slug;

  const header = (
    <View style={styles.heading}>
      {business ? (
        <Avatar name={business.business_name} uri={business.logo_url} size={56} />
      ) : (
        <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
          <Building size={26} color={colors.primary} strokeWidth={ICON_STROKE} />
        </View>
      )}
      <Text variant="title" accessibilityRole="header">
        {step === "business" ? t("portal.signIn.title") : t("portal.signIn.titleFor", { name })}
      </Text>
      <Text variant="subhead" tone="muted">
        {step === "business"
          ? t("portal.signIn.businessHint")
          : step === "email"
            ? t("portal.signIn.emailHint")
            : step === "code"
              ? t("portal.signIn.codeSent", { email: email.trim() })
              : t("portal.signIn.passwordHint")}
      </Text>
    </View>
  );

  return (
    <FormScreen topInset={false}>
      {header}
      {error ? <Banner message={error} /> : null}

      {step === "business" ? (
        <>
          <Input
            label={t("portal.signIn.businessCode")}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => slug && find.mutate()}
            hint={t("portal.signIn.businessCodeHint")}
          />
          <Button label={t("common.continue")} size="lg" fullWidth loading={find.isPending} disabled={!slug} onPress={() => find.mutate()} />
        </>
      ) : null}

      {step === "email" ? (
        <>
          <Input
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            autoFocus
          />
          <Button
            label={t("portal.signIn.emailMeCode")}
            icon={Mail}
            size="lg"
            fullWidth
            loading={sendCode.isPending}
            onPress={() => (looksLikeEmail(email) ? sendCode.mutate() : setError(t("auth.invalidEmail")))}
          />
          <Button
            label={t("portal.signIn.usePassword")}
            icon={KeyRound}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => {
              if (!looksLikeEmail(email)) return setError(t("auth.invalidEmail"));
              setError(null);
              setStep("password");
            }}
          />
          {!params.business ? <Button label={t("portal.signIn.otherBusiness")} variant="ghost" onPress={() => setStep("business")} /> : null}
        </>
      ) : null}

      {step === "code" ? (
        <>
          <Input
            label={t("portal.signIn.code")}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
          />
          <Button label={t("auth.signIn")} size="lg" fullWidth loading={verify.isPending} disabled={otp.length !== 6} onPress={() => verify.mutate()} />
          <Button label={t("portal.signIn.resend")} variant="ghost" loading={sendCode.isPending} onPress={() => sendCode.mutate()} />
        </>
      ) : null}

      {step === "password" ? (
        <>
          <Input label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="password" autoComplete="current-password" autoFocus />
          <Button label={t("auth.signIn")} size="lg" fullWidth loading={verify.isPending} disabled={!password} onPress={() => verify.mutate()} />
          <Button label={t("portal.signIn.emailMeCodeInstead")} variant="ghost" onPress={() => sendCode.mutate()} />
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.sm, marginBottom: space.sm },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
