import { useEffect } from "react";
import type { ColorValue } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Tabs } from "expo-router/tabs";
import { t } from "@/i18n";
import { useInboxUnreadCount } from "@/features/inbox/useInbox";
import { TabsGate } from "@/session/TabsGate";
import { useTheme } from "@/theme/ThemeProvider";
import { FloatingTabBar } from "@/ui/FloatingTabBar";
import { fonts } from "@/theme/tokens";
import { CircleUserRound, ICON_STROKE, Inbox, KanbanSquare, Sun, Users, type IconComponent } from "@/ui/icons";

/** The selected tab's icon turns bolder and pops. No fill: filling outline icons changed their shape (Account's person vanished into the circle). */
function TabIcon({ Icon, color, size, focused }: { Icon: IconComponent; color: string; size: number; focused: boolean }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduce) scale.set(withSequence(withTiming(0.84, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 260 })));
  }, [focused, reduce, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={style}>
      <Icon size={size} color={color} strokeWidth={focused ? ICON_STROKE + 0.5 : ICON_STROKE} />
    </Animated.View>
  );
}

/**
 * The five tabs on a floating, rounded bar with a springy indigo pill (Android and the web preview). iPhone keeps
 * the system tab bar (_layout.tsx), which is already the floating glass bar there; Android's stock bar looked dated.
 */
export function FloatingTabsLayout() {
  const { colors } = useTheme();
  const inboxUnread = useInboxUnreadCount() ?? 0;
  const icon = (Icon: IconComponent) =>
    function Icon_({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <TabIcon Icon={Icon} color={typeof color === "string" ? color : colors.textMuted} size={size} focused={focused} />;
    };
  return (
    <TabsGate>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("tabs.today"), tabBarIcon: icon(Sun) }} />
        <Tabs.Screen name="inbox" options={{ title: t("tabs.inbox"), tabBarIcon: icon(Inbox), tabBarBadge: inboxUnread ? (inboxUnread > 99 ? "99+" : inboxUnread) : undefined, tabBarBadgeStyle: { backgroundColor: colors.primaryFill, color: colors.onPrimary, fontSize: 11 } }} />
        <Tabs.Screen name="contacts" options={{ title: t("tabs.contacts"), tabBarIcon: icon(Users) }} />
        <Tabs.Screen name="pipeline" options={{ title: t("tabs.pipeline"), tabBarIcon: icon(KanbanSquare) }} />
        <Tabs.Screen name="more" options={{ title: t("tabs.more"), tabBarIcon: icon(CircleUserRound) }} />
      </Tabs>
    </TabsGate>
  );
}
