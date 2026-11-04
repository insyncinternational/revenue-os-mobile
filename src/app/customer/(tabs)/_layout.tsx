import type { ColorValue } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { Tabs } from "expo-router/tabs";
import { TabIcon } from "@/features/navigation/TabsLayout";
import { t } from "@/i18n";
import { unpaidInvoices } from "@/portal/portal";
import { usePortalInvoices } from "@/portal/usePortal";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { TabBar } from "@/ui/TabBar";
import { CalendarDays, CircleUserRound, MessageCircle, Receipt, Sun, type IconComponent } from "@/ui/icons";

/** The customer's five tabs on the same fixed bottom bar as the rest of the app. */
export default function CustomerTabs() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const unpaid = unpaidInvoices(usePortalInvoices().data?.invoices ?? []).length;
  const icon = (Icon: IconComponent) =>
    function Icon_({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <TabIcon Icon={Icon} color={typeof color === "string" ? color : colors.textMuted} size={size} focused={focused} />;
    };
  return (
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
      <Tabs.Screen name="index" options={{ title: t("portal.tabs.home"), tabBarIcon: icon(Sun) }} />
      <Tabs.Screen name="appointments" options={{ title: t("portal.tabs.appointments"), tabBarIcon: icon(CalendarDays) }} />
      <Tabs.Screen name="messages" options={{ title: t("portal.tabs.messages"), tabBarIcon: icon(MessageCircle) }} />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t("portal.tabs.invoices"),
          tabBarIcon: icon(Receipt),
          tabBarBadge: unpaid ? unpaid : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primaryFill, color: colors.onPrimary, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="me" options={{ title: t("portal.tabs.me"), tabBarIcon: icon(CircleUserRound) }} />
    </Tabs>
  );
}
