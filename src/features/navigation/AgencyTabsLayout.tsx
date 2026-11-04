import type { ColorValue } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { Tabs } from "expo-router/tabs";
import { AgencyGate } from "@/features/agency/AgencyGate";
import { useAgencyAlerts } from "@/features/agency/useAgencyAlerts";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { TabBar } from "@/ui/TabBar";
import { Bell, CircleUserRound, LayoutGrid, Sparkles, Users, type IconComponent } from "@/ui/icons";
import { TabIcon } from "./TabsLayout";

/** The agency area's five tabs on the fixed bottom bar (ui/TabBar), on every platform. */
export function AgencyTabsLayout() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const alerts = useAgencyAlerts().unread;
  const icon = (Icon: IconComponent) =>
    function Icon_({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <TabIcon Icon={Icon} color={typeof color === "string" ? color : colors.textMuted} size={size} focused={focused} />;
    };
  return (
    <AgencyGate>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: reduce ? "none" : "shift",
          transitionSpec: { animation: "timing", config: { duration: 180 } },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("agency.tabs.home"), tabBarIcon: icon(LayoutGrid) }} />
        <Tabs.Screen name="clients" options={{ title: t("agency.tabs.clients"), tabBarIcon: icon(Users) }} />
        <Tabs.Screen name="credits" options={{ title: t("agency.tabs.credits"), tabBarIcon: icon(Sparkles) }} />
        <Tabs.Screen
          name="alerts"
          options={{
            title: t("agency.tabs.alerts"),
            tabBarIcon: icon(Bell),
            tabBarBadge: alerts ? (alerts > 99 ? "99+" : alerts) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primaryFill, color: colors.onPrimary, fontSize: 11 },
          }}
        />
        <Tabs.Screen name="account" options={{ title: t("tabs.more"), tabBarIcon: icon(CircleUserRound) }} />
      </Tabs>
    </AgencyGate>
  );
}
