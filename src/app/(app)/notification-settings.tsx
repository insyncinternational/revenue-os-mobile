import { useEffect, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, Switch, View } from "react-native";
import { Stack } from "expo-router";
import { userMessage } from "@/api/errors";
import { useNotificationPreferences, useSetPreference } from "@/features/notifications/usePreferences";
import { t } from "@/i18n";
import { askForPush, pushPermission, registerForPush, type PushPermission } from "@/push/push";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, onSolid, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

/** Which notifications reach this phone, per kind — and a way back in when the phone itself blocks them. */
export default function NotificationSettings() {
  const { colors } = useTheme();
  const prefs = useNotificationPreferences();
  const set = useSetPreference();
  const [permission, setPermission] = useState<PushPermission | null>(null);

  // Re-checked when the user comes back from the phone's Settings.
  useEffect(() => {
    const check = () => void pushPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, []);

  const allow = async () => {
    if (permission === "denied") return void Linking.openSettings();
    const result = await askForPush();
    setPermission(result);
    if (result === "granted") void registerForPush();
  };

  return (
    <>
      <Stack.Screen options={{ title: t("notifSettings.title") }} />
      <Screen onRefresh={() => void prefs.refetch()} refreshing={prefs.isRefetching}>
        {permission === "denied" || permission === "undetermined" ? (
          <View style={styles.block}>
            <Banner kind="warning" message={permission === "denied" ? t("notifSettings.blocked") : t("notifSettings.notAsked")} />
            <Button label={permission === "denied" ? t("notifSettings.openSettings") : t("notifSettings.allow")} variant="secondary" onPress={() => void allow()} />
          </View>
        ) : permission === "unsupported" ? (
          <View style={styles.block}>
            <Text variant="footnote" tone="muted">
              {t("notifSettings.unsupported")}
            </Text>
          </View>
        ) : null}

        <SectionHeader title={t("notifSettings.push")} />
        <Text variant="footnote" tone="muted" style={styles.hint}>
          {t("notifSettings.pushHint")}
        </Text>
        {prefs.data ? (
          <Card padded={false} style={styles.card}>
            {prefs.data.categories.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Divider inset={space.lg} /> : null}
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="callout" weight="medium">
                      {c.label}
                    </Text>
                    <Text variant="footnote" tone="muted" numberOfLines={2}>
                      {c.description}
                    </Text>
                  </View>
                  <Switch
                    value={c.push}
                    onValueChange={(push) => set.mutate({ id: c.id, change: { push } })}
                    accessibilityLabel={c.label}
                    trackColor={{ true: colors.primaryFill, false: colors.borderStrong }}
                    thumbColor={onSolid}
                    ios_backgroundColor={colors.surfaceTertiary}
                    // react-native-web colours the "on" thumb with its own prop (teal by default).
                    {...(Platform.OS === "web" ? ({ activeThumbColor: onSolid } as object) : {})}
                  />
                </View>
              </View>
            ))}
          </Card>
        ) : prefs.isPending ? (
          <DelayedFallback>
            <SkeletonList rows={6} />
          </DelayedFallback>
        ) : (
          <ErrorState message={userMessage(prefs.error)} onRetry={() => void prefs.refetch()} />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, paddingTop: space.md, gap: space.sm },
  hint: { paddingHorizontal: gutter, marginBottom: space.sm },
  card: { marginHorizontal: gutter },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
