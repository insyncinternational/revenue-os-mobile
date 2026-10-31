import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { LANGUAGES, setLanguage, t, useLanguage, type AppLanguage } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { useSession } from "@/session/sessionStore";
import { useWorkspaceAccess } from "@/session/workspace";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ArrowLeftRight, ICON_STROKE, LayoutGrid, LogOut } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Text } from "@/ui/Text";

export default function More() {
  const { colors, preference, setPreference } = useTheme();
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const access = useWorkspaceAccess().data;
  const language = useLanguage((s) => s.language);

  const workspaceName = access?.workspace.name ?? "…";
  const clientName = access?.client?.name && access.client.name !== workspaceName ? access.client.name : null;

  return (
    <Screen>
      <Card padded={false} style={styles.card}>
        <View style={styles.profile}>
          <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={52} />
          <View style={styles.profileText}>
            <Text variant="headline" numberOfLines={1}>
              {user?.name || user?.email}
            </Text>
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title={t("more.workspace")} />
      <Card padded={false} style={styles.card}>
        <ListRow
          title={clientName ?? workspaceName}
          subtitle={clientName ? workspaceName : access?.source === "agency" ? t("workspace.viaAgency") : null}
          chevron
          onPress={() => router.push("/switcher")}
          accessibilityHint={t("workspace.title")}
          leading={
            <View style={[styles.rowIcon, { backgroundColor: colors.primarySubtle }]}>
              <ArrowLeftRight size={18} color={colors.primary} strokeWidth={ICON_STROKE} />
            </View>
          }
          trailing={access?.source === "agency" ? <Badge label={t("workspace.clients")} tone="brand" /> : undefined}
        />
      </Card>

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
        <SegmentedControl<AppLanguage> value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ key: l.code, label: l.nativeName }))} />
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
            if (await confirm(t("more.signOutConfirm"), t("more.signOut"), t("common.cancel"), true)) await signOut();
          }}
        />
        <Text variant="footnote" tone="subtle" align="center">
          {t("more.version", { version: Constants.expoConfig?.version ?? "" })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter },
  block: { paddingHorizontal: gutter },
  profile: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  signOut: { marginTop: space.xxxl, gap: space.md },
});
