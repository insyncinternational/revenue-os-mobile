import { Stack } from "expo-router";
import { useCallFollowUpPrompt } from "@/features/contacts/callFollowUp";
import { t } from "@/i18n";
import { APP_BRAND_NAME } from "@/lib/brand";
import { usePushSetup } from "@/push/usePushSetup";
import { useRealtime } from "@/realtime/useRealtime";
import { AppLockGate } from "@/session/AppLockGate";
import { useStackOptions } from "@/theme/stackOptions";

/**
 * Screens opened directly (a tapped push → a conversation or contact) still have the tabs beneath them, so
 * Back always works.
 */
export const unstable_settings = { anchor: "(tabs)" };

/** Signed in and allowed in: the tabs, plus screens that sit above them (switcher sheet, notifications, UI gallery). */
export default function AppLayout() {
  const options = useStackOptions();
  usePushSetup();
  useRealtime();
  useCallFollowUpPrompt();
  return (
    <>
      <Stack screenOptions={options}>
        {/* The title is what Back is called on screens above the tabs ("Revenue OS, back" for screen readers). */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: APP_BRAND_NAME }} />
        <Stack.Screen
          name="switcher"
          options={{
            title: t("workspace.title"),
            presentation: "formSheet",
            sheetAllowedDetents: [0.6, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 16,
            headerShown: false,
          }}
        />
        <Stack.Screen name="notifications" options={{ title: t("notif.title"), headerLargeTitle: true }} />
        <Stack.Screen name="conversation/[itemId]" options={{ title: "" }} />
        <Stack.Screen name="contact/[id]" options={{ title: "" }} />
        <Stack.Screen name="deal/[id]" options={{ title: "" }} />
        <Stack.Screen name="deal-form" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="move-deal" options={{ presentation: "formSheet", sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false }} />
        <Stack.Screen name="pipeline-picker" options={{ presentation: "formSheet", sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false }} />
        <Stack.Screen name="contact-form" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="log-call" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false }} />
        <Stack.Screen name="calendar" options={{ title: t("calendar.title"), headerLargeTitle: true }} />
        <Stack.Screen name="meeting/[id]" options={{ title: "" }} />
        <Stack.Screen name="meeting-form" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="meeting-outcome" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false }} />
        <Stack.Screen name="tasks" options={{ title: t("tasks.title"), headerLargeTitle: true }} />
        <Stack.Screen name="task-form" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="invoices" options={{ title: t("invoice.title"), headerLargeTitle: true }} />
        <Stack.Screen name="invoice/[id]" options={{ title: "" }} />
        <Stack.Screen name="invoice-form" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="profile" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="change-password" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
        <Stack.Screen name="approvals" options={{ title: t("approvals.title"), headerLargeTitle: true }} />
        <Stack.Screen name="campaigns" options={{ title: t("campaigns.title"), headerLargeTitle: true }} />
        <Stack.Screen name="approval/[id]" options={{ title: "" }} />
        <Stack.Screen name="notification-settings" options={{ title: t("notifSettings.title"), headerLargeTitle: true }} />
        <Stack.Screen name="email-original" options={{ presentation: "modal", title: "" }} />
        <Stack.Screen name="contact-peek" options={{ presentation: "formSheet", sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false }} />
        <Stack.Screen name="gallery" options={{ title: t("more.gallery"), headerLargeTitle: true }} />
      </Stack>
      {/* Face ID / fingerprint cover (a native modal, so it covers open sheets too). */}
      <AppLockGate />
    </>
  );
}
