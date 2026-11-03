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
import { radius, space } from "@/theme/tokens";
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
 * The row on top of every tab header except Today: the workspace switcher pill, the bell and the person.
 * Today lays the same pieces out around its greeting (WorkspaceButton plain, HeaderActions).
 */
export function HeroTopBar({ hideProfile }: { hideProfile?: boolean } = {}) {
  return (
    <View style={styles.row}>
      <WorkspaceButton />
      <HeaderActions hideProfile={hideProfile} />
    </View>
  );
}

/** Opens the workspace switcher: a pill, or (`plain`) a line of text with a green dot, for under Today's greeting. */
export function WorkspaceButton({ plain }: { plain?: boolean }) {
  const { colors } = useTheme();
  const access = useWorkspaceAccess().data;
  const workspace = access?.client?.name ?? access?.workspace.name ?? "…";
  const chip = useHeaderChip();
  return (
    <Pressable
      onPress={() => router.push("/switcher")}
      accessibilityRole="button"
      accessibilityLabel={`${workspace}. ${t("workspace.title")}`}
      hitSlop={8}
      style={({ pressed }) => [plain ? styles.plain : [styles.pill, chip], { opacity: pressed ? 0.7 : 1 }]}
    >
      {plain ? <View style={[styles.live, { backgroundColor: colors.success }]} /> : null}
      <Text variant={plain ? "callout" : "subhead"} weight={plain ? "medium" : "semibold"} numberOfLines={1} style={[styles.pillText, { color: plain ? colors.textSecondary : colors.text }]}>
        {workspace}
      </Text>
      <ChevronDown size={16} color={colors.textMuted} strokeWidth={ICON_STROKE + 0.25} />
    </Pressable>
  );
}

/** The bell (with an unread dot) and the person (opens Account), as round floating buttons. */
export function HeaderActions({ hideProfile }: { hideProfile?: boolean }) {
  const { colors } = useTheme();
  const user = useSession((s) => s.user);
  const unread = useUnreadNotifications();
  const chip = useHeaderChip();
  return (
    <View style={styles.actions}>
      <PressableScale
        onPress={() => {
          haptics.selection();
          go("/notifications");
        }}
        accessibilityLabel={unread > 0 ? t("today.unreadNotifications", { count: unread }) : t("today.notifications")}
        style={[styles.circle, chip]}
      >
        <Bell size={20} color={colors.text} strokeWidth={ICON_STROKE} />
        {unread > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger, borderColor: colors.surface }]} /> : null}
      </PressableScale>
      {/* The person: opens More (profile, settings, sign out). Their photo, else initials on their gradient. */}
      {hideProfile ? null : (
        <PressableScale
          onPress={() => {
            haptics.selection();
            router.navigate("/more");
          }}
          accessibilityLabel={t("more.openAccount", { name: user?.name || user?.email || "" })}
        >
          <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={44} />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  pill: { flexDirection: "row", alignItems: "center", gap: space.xs, height: 34, paddingLeft: space.md, paddingRight: space.sm, borderRadius: radius.pill, borderWidth: 1, flexShrink: 1 },
  pillText: { flexShrink: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  plain: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, alignSelf: "flex-start" },
  live: { width: 8, height: 8, borderRadius: 4 },
  dot: { position: "absolute", top: 10, right: 11, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
});
