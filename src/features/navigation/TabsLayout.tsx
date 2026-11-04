import { useEffect } from "react";
import type { ColorValue } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Tabs } from "expo-router/tabs";
import { t } from "@/i18n";
import { useInboxUnreadCount } from "@/features/inbox/useInbox";
import { TabsGate } from "@/session/TabsGate";
import { useTheme } from "@/theme/ThemeProvider";
import { TabBar } from "@/ui/TabBar";
import { fonts } from "@/theme/tokens";
import { ICON_STROKE, LayoutGrid, Inbox, KanbanSquare, Sun, Users, type IconComponent } from "@/ui/icons";

/** The selected tab's icon turns bolder and pops as its pill opens. */
export function TabIcon({ Icon, color, size, focused }: { Icon: IconComponent; color: string; size: number; focused: boolean }) {
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

/** The five main tabs on the fixed bottom bar (ui/TabBar), on every platform. */
export function TabsLayout() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const inboxUnread = useInboxUnreadCount() ?? 0;
  const icon = (Icon: IconComponent) =>
    function Icon_({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <TabIcon Icon={Icon} color={typeof color === "string" ? color : colors.textMuted} size={size} focused={focused} />;
    };
  return (
    <TabsGate>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Switching tabs: a quick fade with a small slide (about 180 ms), none with Reduce Motion.
          animation: reduce ? "none" : "shift",
          transitionSpec: { animation: "timing", config: { duration: 180 } },
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
        <Tabs.Screen name="more" options={{ title: t("tabs.more"), tabBarIcon: icon(LayoutGrid) }} />
      </Tabs>
    </TabsGate>
  );
}
