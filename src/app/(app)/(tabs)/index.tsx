import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { greetingKey } from "@/lib/greeting";
import { useSession } from "@/session/sessionStore";
import { useWorkspaceAccess } from "@/session/workspace";
import { gutter, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { Sun } from "@/ui/icons";
import { Screen } from "@/ui/Screen";
import { EmptyState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { WorkspacePill } from "@/ui/WorkspacePill";

/** Today (M1: the frame — greeting and workspace; the day's content arrives in M2). */
export default function Today() {
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const access = useWorkspaceAccess();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

  return (
    // No navigation header here: the greeting is the header, so the safe area is applied by hand (once).
    <Screen contentInsetAdjustmentBehavior="never" onRefresh={() => void access.refetch()} refreshing={access.isRefetching}>
      <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
        <View style={styles.headerText}>
          <WorkspacePill />
          <Text variant="largeTitle" numberOfLines={2} accessibilityRole="header">
            {firstName ? `${t(greetingKey(new Date().getHours()))}, ${firstName}` : t(greetingKey(new Date().getHours()))}
          </Text>
        </View>
        <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={40} />
      </View>
      <Card padded={false} style={styles.card}>
        <EmptyState icon={Sun} title={t("soon.title")} message={t("soon.today")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingHorizontal: gutter, paddingBottom: space.lg },
  headerText: { flex: 1, gap: space.md },
  card: { marginHorizontal: gutter },
});
