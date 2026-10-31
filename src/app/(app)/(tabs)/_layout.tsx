import { NativeTabs } from "expo-router/native-tabs";
import { t } from "@/i18n";
import { TabsGate } from "@/session/TabsGate";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The five tabs, on the phone's own tab bar (SF Symbols on iOS, Material icons on Android).
 * The web preview uses _layout.web.tsx (native tabs have no proper web version).
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <TabsGate>
      <NativeTabs
        tintColor={colors.primary}
        iconColor={{ default: colors.textMuted, selected: colors.primary }}
        labelStyle={{ default: { color: colors.textMuted }, selected: { color: colors.primary } }}
        backgroundColor={colors.surface}
        badgeBackgroundColor={colors.primaryFill}
        indicatorColor={colors.primarySubtle}
        rippleColor={colors.pressed}
        minimizeBehavior="onScrollDown"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t("tabs.today")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} md="today" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="inbox">
          <NativeTabs.Trigger.Label>{t("tabs.inbox")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "tray", selected: "tray.fill" }} md="inbox" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="contacts">
          <NativeTabs.Trigger.Label>{t("tabs.contacts")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} md="group" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="pipeline">
          <NativeTabs.Trigger.Label>{t("tabs.pipeline")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} md="view_kanban" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="more">
          <NativeTabs.Trigger.Label>{t("tabs.more")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} md="more_horiz" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabsGate>
  );
}
