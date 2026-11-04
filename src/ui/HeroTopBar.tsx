import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { go } from "@/lib/navigate";
import { keys } from "@/query/keys";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId, useWorkspaceAccess } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Avatar } from "./Avatar";
import { useHeaderChip } from "./headerChip";
import { Bell, ChevronDown, ICON_STROKE } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/** Unread notifications, shared by every header bell (one cached request). */
export function useUnreadNotifications(): number {
  // The active workspace's, like the web's bell (its own notifications plus account-wide ones).
  const baseId = useActiveBaseId();
  const unread = useQuery({
    queryKey: keys.notifications.unreadCount(baseId),
    queryFn: ({ signal }) => notificationsApi.unreadCount(baseId, signal),
    staleTime: 30_000,
  });
  return unread.data?.unread_count ?? 0;
}

/**
 * The row on top of every main screen: the person (opens Account) and the workspace name (opens the switcher) on
 * the left, the bell on the right. `hideProfile`: the Account tab, which shows the person as its title.
 */
export function HeroTopBar({ hideProfile }: { hideProfile?: boolean } = {}) {
  return (
    <View style={styles.row}>
      {hideProfile ? null : <ProfileButton />}
      <WorkspaceButton />
      <View style={styles.spacer} />
      <HeaderActions />
    </View>
  );
}

/** The workspace name with a small chevron: opens the workspace switcher. */
export function WorkspaceButton() {
  const { colors } = useTheme();
  const access = useWorkspaceAccess().data;
  const workspace = access?.client?.name ?? access?.workspace.name ?? "…";
  return (
    <Pressable
      onPress={() => router.push("/switcher")}
      accessibilityRole="button"
      accessibilityLabel={`${workspace}. ${t("workspace.title")}`}
      hitSlop={10}
      style={({ pressed }) => [styles.workspace, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text variant="subhead" weight="medium" numberOfLines={1} style={[styles.workspaceText, { color: colors.text }]}>
        {workspace}
      </Text>
      <ChevronDown size={15} color={colors.textMuted} strokeWidth={ICON_STROKE + 0.25} />
    </Pressable>
  );
}

/** The signed-in person: their photo or initials; opens Account (profile, settings, sign out). */
export function ProfileButton() {
  const user = useSession((s) => s.user);
  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        router.navigate("/more");
      }}
      accessibilityLabel={t("more.openAccount", { name: user?.name || user?.email || "" })}
    >
      <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={40} accent />
    </PressableScale>
  );
}

/** The bell, a white circle with an ink dot when something is unread. */
export function HeaderActions() {
  const { colors } = useTheme();
  const unread = useUnreadNotifications();
  const chip = useHeaderChip();
  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        go("/notifications");
      }}
      accessibilityLabel={unread > 0 ? t("today.unreadNotifications", { count: unread }) : t("today.notifications")}
      style={[styles.circle, chip]}
    >
      <Bell size={20} color={colors.text} strokeWidth={ICON_STROKE} />
      {unread > 0 ? <View style={[styles.dot, { backgroundColor: colors.primaryFill, borderColor: colors.surface }]} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  spacer: { flex: 1 },
  workspace: { flexDirection: "row", alignItems: "center", gap: space.xs, flexShrink: 1, minHeight: 40 },
  workspaceText: { flexShrink: 1 },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 11, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
