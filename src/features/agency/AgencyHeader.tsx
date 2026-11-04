import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space, type Area } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Backdrop } from "@/ui/Backdrop";
import { useHeaderChip } from "@/ui/headerChip";
import { HeaderAction } from "@/ui/HeaderAction";
import { Bell, ChevronDown, ICON_STROKE, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { useAgencyAlerts } from "./useAgencyAlerts";
import { useAgencyInfo } from "./useAgency";

/**
 * The header of every agency tab, in the same family as the workspace tabs': the agency pill (opens the switcher:
 * other agencies and clients), the alerts bell and the person, then a bold title and one line of status.
 */
export function AgencyHeader({
  title,
  summary,
  area,
  hideProfile,
  action,
  greeting,
  children,
}: {
  title: string;
  summary?: string | null;
  area?: Area;
  hideProfile?: boolean;
  /** The tab's main "add" action: an ink round button beside the title (replaces the floating +). */
  action?: { label: string; onPress: () => void; icon?: IconComponent };
  /** Home: "Good afternoon," small with the first name large under it (like Today), instead of the title. */
  greeting?: { hello: string; name?: string };
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + space.md }]}>
      {area ? <Backdrop area={area} /> : null}
      <AgencyTopBar hideProfile={hideProfile} />
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          {greeting ? (
            <View accessible accessibilityRole="header" accessibilityLabel={title} style={styles.greeting}>
              <Text variant="callout" tone="muted">
                {greeting.name ? `${greeting.hello},` : greeting.hello}
              </Text>
              {greeting.name ? (
                <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text }}>
                  {`${greeting.name}.`}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text variant="largeTitle" style={[styles.title, { color: colors.text }]} accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
          )}
          {summary ? (
            <Text variant="subhead" style={{ color: colors.textMuted }} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        {action ? <HeaderAction {...action} /> : null}
      </View>
      {children}
    </View>
  );
}

export function AgencyTopBar({ hideProfile }: { hideProfile?: boolean }) {
  const { colors } = useTheme();
  const chip = useHeaderChip();
  const info = useAgencyInfo().data;
  const name = info?.agency.brand_name || info?.agency.name || "…";
  const user = useSession((s) => s.user);
  const unread = useAgencyAlerts().unread;
  // The mock's top row: the person (glossy accent), the agency name with a chevron (the switcher), the bell.
  return (
    <View style={styles.row}>
      {hideProfile ? null : (
        <PressableScale
          onPress={() => {
            haptics.selection();
            router.navigate("/agency/account");
          }}
          accessibilityLabel={t("more.openAccount", { name: user?.name || user?.email || "" })}
        >
          <Avatar name={user?.name || user?.email || "?"} uri={user?.avatar_url} size={40} accent />
        </PressableScale>
      )}
      <Pressable
        onPress={() => router.push("/switcher")}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${t("workspace.title")}`}
        hitSlop={10}
        style={({ pressed }) => [styles.name, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text variant="subhead" weight="medium" numberOfLines={1} style={[styles.pillText, { color: colors.text }]}>
          {name}
        </Text>
        <ChevronDown size={15} color={colors.textMuted} strokeWidth={ICON_STROKE + 0.25} />
      </Pressable>
      <View style={styles.spacer} />
      <PressableScale
        onPress={() => {
          haptics.selection();
          router.navigate("/agency/alerts");
        }}
        accessibilityLabel={unread > 0 ? t("today.unreadNotifications", { count: unread }) : t("agency.tabs.alerts")}
        style={[styles.circle, chip]}
      >
        <Bell size={20} color={colors.text} strokeWidth={ICON_STROKE} />
        {unread > 0 ? <View style={[styles.dot, { backgroundColor: colors.primaryFill, borderColor: colors.surface }]} /> : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  band: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.lg },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  greeting: { marginTop: space.sm },
  title: { letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  name: { flexDirection: "row", alignItems: "center", gap: space.xs, flexShrink: 1, minHeight: 40 },
  spacer: { flex: 1 },
  pillText: { flexShrink: 1 },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 11, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
