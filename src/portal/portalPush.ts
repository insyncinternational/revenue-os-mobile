/**
 * Push for customers: registers this phone with every business the customer is signed in to (so a reply, a booking
 * change, a reminder or a new invoice reaches them), and opens the right screen when a notification is tapped.
 * The backend sends `{ kind: "portal_message" | "portal_meeting" | "portal_invoice", slug, id }`.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { portalAuthApi } from "@/api/portal";
import { expoPushToken } from "@/push/push";
import { usePortalSession } from "./portalSession";

type PortalPush = { kind?: string; slug?: string };

/** Pure: the customer screen a push opens. */
export function portalScreenFor(kind: string | undefined): Href {
  if (kind === "portal_message") return "/customer/messages" as Href;
  if (kind === "portal_meeting") return "/customer/appointments" as Href;
  if (kind === "portal_invoice") return "/customer/invoices" as Href;
  return "/customer" as Href;
}

function openFromPush(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data as PortalPush | undefined;
  if (!data?.kind?.startsWith("portal_")) return;
  if (data.slug) usePortalSession.getState().switchTo(data.slug.toLowerCase());
  router.navigate(portalScreenFor(data.kind));
}

export function usePortalPushSetup(): void {
  const tokens = usePortalSession((s) => s.sessions.map((x) => x.token).join(","));

  // Register with each business whenever the signed-in set changes (silent when notifications are off).
  useEffect(() => {
    if (!tokens) return;
    void (async () => {
      const push = await expoPushToken();
      if (!push) return;
      const platform = Platform.OS === "ios" ? "ios" : "android";
      for (const token of tokens.split(",")) await portalAuthApi.registerDevice(token, { token: push, platform, app_version: Constants.expoConfig?.version ?? null, device_name: Device.deviceName ?? Device.modelName ?? null }).catch(() => undefined);
    })();
  }, [tokens]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) openFromPush(r);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(openFromPush);
    return () => sub.remove();
  }, []);
}
