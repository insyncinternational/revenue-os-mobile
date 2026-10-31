import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { t } from "@/i18n";
import { Button } from "@/ui/Button";
import { Building, LogOut } from "@/ui/icons";
import { Screen } from "@/ui/Screen";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState } from "@/ui/States";
import { useSession } from "./sessionStore";
import { useWorkspaceBootstrap } from "./workspace";

/** Shows the tabs once a workspace is selected; otherwise a loading state or "no workspace yet". */
export function TabsGate({ children }: { children: ReactNode }) {
  const { noWorkspace, loading } = useWorkspaceBootstrap();
  const signOut = useSession((s) => s.signOut);

  if (loading) {
    return (
      <Screen fixed>
        <SkeletonList rows={6} />
      </Screen>
    );
  }
  if (noWorkspace) {
    // No workspace of their own (agency staff before opening a client, or an invite not accepted yet).
    return (
      <Screen fixed>
        <View style={styles.center}>
          <EmptyState
            icon={Building}
            title={t("workspace.noWorkspaceTitle")}
            message={t("workspace.noWorkspaceMessage")}
            actionLabel={t("workspace.title")}
            onAction={() => router.push("/switcher")}
          />
          <Button label={t("more.signOut")} variant="ghost" icon={LogOut} onPress={() => void signOut()} style={styles.signOut} />
        </View>
      </Screen>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  signOut: { alignSelf: "center" },
});
