import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { ICON_STROKE, Mail } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

const RESEND_COOLDOWN_S = 30;

/** Signed in, but the email isn't verified yet: enter the 6-digit code from the verification email. */
export default function VerifyEmail() {
  const { colors } = useTheme();
  const toast = useToast();
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const signOut = useSession((s) => s.signOut);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const confirm = useMutation({
    mutationFn: async (value: string) => {
      await authApi.confirmVerificationCode(value);
      return (await authApi.me()).user;
    },
    onSuccess: (fresh) => {
      haptics.success();
      setUser({ ...fresh, email_verified: true });
    },
    onError: () => {
      haptics.warning();
      setCode("");
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.sendVerificationEmail(),
    onSuccess: () => {
      toast.show(t("gate.codeSent"), { kind: "success" });
      startCooldown();
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !confirm.isPending) confirm.mutate(digits);
  };

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
      <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
        <Mail size={26} color={colors.primary} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("gate.verifyTitle")}
        </Text>
        <Text variant="body" tone="secondary">
          {t("gate.verifyMessage", { email: user?.email ?? "" })}
        </Text>
      </View>
      {confirm.error ? <Banner message={userMessage(confirm.error)} /> : null}
      <Input
        label={t("auth.code")}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        style={styles.codeInput}
      />
      <Button label={t("auth.verify")} size="lg" fullWidth loading={confirm.isPending} disabled={code.length < 6} onPress={() => confirm.mutate(code)} />
      <Button
        label={cooldown > 0 ? t("gate.resendIn", { seconds: cooldown }) : t("gate.resendCode")}
        variant="ghost"
        fullWidth
        loading={resend.isPending}
        disabled={cooldown > 0}
        onPress={() => resend.mutate()}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  heading: { gap: space.xs },
  codeInput: { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: 10, textAlign: "center" },
  center: { alignSelf: "center", paddingVertical: space.xs },
});
