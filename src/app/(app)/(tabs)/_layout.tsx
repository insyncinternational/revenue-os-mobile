import { NativeTabs } from "expo-router/native-tabs";
import { t } from "@/i18n";
import { useInboxUnreadCount } from "@/features/inbox/useInbox";
import { TabsGate } from "@/session/TabsGate";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * iPhone: the five tabs on the system tab bar (SF Symbols; the floating glass bar on current iOS).
 * Android and the web preview use the floating bar instead (_layout.android.tsx, _layout.web.tsx).
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const inboxUnread = useInboxUnreadCount() ?? 0;
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
        // Android: a label under every tab, not only the selected one — clearer for people new to the app.
        labelVisibilityMode="labeled"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t("tabs.today")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} md="light_mode" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="inbox">
          <NativeTabs.Trigger.Label>{t("tabs.inbox")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "tray", selected: "tray.fill" }} md="inbox" />
          {inboxUnread ? <NativeTabs.Trigger.Badge>{inboxUnread > 99 ? "99+" : String(inboxUnread)}</NativeTabs.Trigger.Badge> : null}
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
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabsGate>
  );
}
