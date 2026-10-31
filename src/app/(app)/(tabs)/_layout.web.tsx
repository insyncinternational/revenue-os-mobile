import type { ColorValue } from "react-native";
import { Tabs } from "expo-router/tabs";
import { t } from "@/i18n";
import { TabsGate } from "@/session/TabsGate";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { ICON_STROKE, Inbox, KanbanSquare, MoreHorizontal, Sun, Users, type IconComponent } from "@/ui/icons";

/** Web preview only: a regular bottom tab bar with the same tabs as the native one (_layout.tsx). */
export default function WebTabsLayout() {
  const { colors } = useTheme();
  const icon = (Icon: IconComponent) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Icon size={size} color={typeof color === "string" ? color : colors.textMuted} strokeWidth={ICON_STROKE} />;
    };
  return (
    <TabsGate>
      <Tabs
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
        <Tabs.Screen name="inbox" options={{ title: t("tabs.inbox"), tabBarIcon: icon(Inbox) }} />
        <Tabs.Screen name="contacts" options={{ title: t("tabs.contacts"), tabBarIcon: icon(Users) }} />
        <Tabs.Screen name="pipeline" options={{ title: t("tabs.pipeline"), tabBarIcon: icon(KanbanSquare) }} />
        <Tabs.Screen name="more" options={{ title: t("tabs.more"), tabBarIcon: icon(MoreHorizontal) }} />
      </Tabs>
    </TabsGate>
  );
}
