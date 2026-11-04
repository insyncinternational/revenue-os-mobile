import { useState } from "react";
import { router, Stack } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { passwordStrength } from "@/lib/password";
import { StyleSheet, View } from "react-native";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { KeyRound } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** Same rule as the server (utils/passwordHash.ts newPasswordSchema): at least 8 characters. */
const MIN = 8;

/**
 * Change password. The server ends every other session when it changes; this phone gets the fresh one back and
 * keeps it, so the person who changed it stays signed in here.
 */
export default function ChangePasswordScreen() {
  const toast = useToast();
  const adoptToken = useSession((s) => s.adoptToken);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);
  const tooShort = next.length > 0 && next.length < MIN;
  const mismatch = again.length > 0 && again !== next;

  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: async (r) => {
      await adoptToken(r.token, r.expires_at);
      haptics.success();
      toast.show(t("password.changed"), { kind: "success" });
      router.back();
    },
  });

  const submit = () => {
    setTried(true);
    if (!current || next.length < MIN || next !== again) return;
    change.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: t("profile.changePassword") }} />
      <FormScreen topInset={false} sheetTitle={t("profile.changePassword")} sticky={<Button label={t("password.save")} size="lg" fullWidth loading={change.isPending} onPress={submit} />}>
        {change.error ? <Banner message={userMessage(change.error)} /> : null}
        {/* One section: a title per field repeated each label right above it. */}
        <FormSection title={t("password.section")} icon={KeyRound}>
          <Input label={t("password.current")} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" textContentType="password" autoFocus error={tried && !current ? t("password.currentRequired") : null} />
          <Input label={t("password.new")} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" textContentType="newPassword" hint={t("password.rule")} error={tooShort || (tried && next.length < MIN) ? t("password.rule") : null} />
          {next ? <StrengthMeter value={passwordStrength(next)} /> : null}
          <Input label={t("password.again")} value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" textContentType="newPassword" error={mismatch ? t("password.mismatch") : null} />
        </FormSection>
        <Banner kind="info" message={t("password.othersSignedOut")} />
      </FormScreen>
    </>
  );
}

const LEVELS: { key: "password.weak" | "password.fair" | "password.good" | "password.strong"; color: keyof Palette }[] = [
  { key: "password.weak", color: "danger" },
  { key: "password.fair", color: "warning" },
  { key: "password.good", color: "success" },
  { key: "password.strong", color: "success" },
];

/** How strong the new password looks: four bars filling red → amber → green, and the word. */
function StrengthMeter({ value }: { value: 0 | 1 | 2 | 3 | 4 }) {
  const { colors } = useTheme();
  const level = LEVELS[Math.max(0, value - 1)]!;
  return (
    <View style={styles.meter} accessible accessibilityLabel={t(level.key)}>
      <View style={styles.bars}>
        {LEVELS.map((l, i) => (
          <View key={l.key} style={[styles.bar, { backgroundColor: i < value ? colors[level.color] : colors.surfaceTertiary }]} />
        ))}
      </View>
      <Text variant="caption" weight="semibold" style={{ color: colors[`${level.color}Text` as keyof Palette] }}>
        {t(level.key)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: -space.xs },
  bars: { flex: 1, flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 5, borderRadius: radius.pill },
});
