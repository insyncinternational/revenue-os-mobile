import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { LANGUAGES, setLanguage, t, useLanguage, type AppLanguage } from "@/i18n";
import { afterDialogCloses, confirm } from "@/lib/confirm";
import { biometricKind, confirmOwner, useAppLock, type BiometricKind } from "@/session/appLock";
import { useSession } from "@/session/sessionStore";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { BellRing, Fingerprint, ICON_STROKE, LayoutGrid, LogOut, ScanFace } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Text } from "@/ui/Text";

/**
 * The settings every Account tab ends with (workspace and agency alike): notification settings, Face ID /
 * fingerprint lock, appearance, language, the UI gallery in development, and Sign out with the app version.
 */
export function AccountSettings() {
  const { colors, preference, setPreference } = useTheme();
  const signOut = useSession((s) => s.signOut);
  const language = useLanguage((s) => s.language);
  const lockOn = useAppLock((s) => s.enabled);
  const [lockKind, setLockKind] = useState<BiometricKind | null>(null);
  useEffect(() => {
    void biometricKind().then(setLockKind);
  }, []);
  // Turning it on asks once, so nobody locks themselves out with biometrics that don't work.
  const toggleLock = async (on: boolean) => {
    if (on && !(await confirmOwner(t("lock.confirmPrompt"), t("common.cancel")))) return;
    useAppLock.getState().setEnabled(on);
  };

  return (
    <>
      <SectionHeader title={t("more.settings")} />
      <Card padded={false} style={styles.card}>
        <ListRow
          title={t("more.notificationSettings")}
          chevron
          onPress={() => router.push("/notification-settings")}
          leading={
            <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
              <BellRing size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
            </View>
          }
        />
      </Card>

      {lockKind ? (
        <>
          <SectionHeader title={t("more.security")} />
          <Card padded={false} style={styles.card}>
            <ListRow
              title={lockKind === "face" ? t("lock.settingFace") : t("lock.setting")}
              subtitle={t("lock.settingHint")}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  {lockKind === "face" ? (
                    <ScanFace size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                  ) : (
                    <Fingerprint size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                  )}
                </View>
              }
              trailing={
                <Switch
                  value={lockOn}
                  onValueChange={(on) => void toggleLock(on)}
                  accessibilityLabel={lockKind === "face" ? t("lock.settingFace") : t("lock.setting")}
                  trackColor={{
                    true: colors.primaryFill,
                    false: colors.borderStrong,
                  }}
                  ios_backgroundColor={colors.surfaceTertiary}
                />
              }
            />
          </Card>
        </>
      ) : null}

      <SectionHeader title={t("more.appearance")} />
      <View style={styles.block}>
        <SegmentedControl<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { key: "system", label: t("appearance.system") },
            { key: "light", label: t("appearance.light") },
            { key: "dark", label: t("appearance.dark") },
          ]}
        />
      </View>

      <SectionHeader title={t("more.language")} />
      <View style={styles.block}>
        <SegmentedControl<AppLanguage>
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((l) => ({
            key: l.code,
            label: l.nativeName,
          }))}
        />
      </View>

      {__DEV__ ? (
        <>
          <SectionHeader title={t("more.developer")} />
          <Card padded={false} style={styles.card}>
            <ListRow
              title={t("more.gallery")}
              chevron
              onPress={() => router.push("/gallery")}
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <LayoutGrid size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                </View>
              }
            />
          </Card>
        </>
      ) : null}

      <View style={[styles.block, styles.signOut]}>
        <Button
          label={t("more.signOut")}
          icon={LogOut}
          variant="danger"
          fullWidth
          onPress={async () => {
            if (await confirm(t("more.signOutConfirm"), t("more.signOut"), t("common.cancel"), true)) {
              await afterDialogCloses();
              await signOut();
            }
          }}
        />
        <Text variant="footnote" tone="subtle" align="center">
          {t("more.version", {
            version: Constants.expoConfig?.version ?? "",
          })}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter },
  block: { paddingHorizontal: gutter },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  signOut: { marginTop: space.xxxl, gap: space.md },
});
