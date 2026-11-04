/**
 * Push notifications on the phone: channels, permission, the Expo push token, and the badge.
 * Web (preview) and simulators have no push; every function is a safe no-op there.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { devicesApi } from "@/api/devices";
import { t } from "@/i18n";
import { storage } from "@/lib/storage";
import { palettes } from "@/theme/tokens";

const TOKEN_KEY = "push.expoToken";
const ASKED_KEY = "push.askDismissedAt";

export const pushSupported = Platform.OS !== "web" && Device.isDevice;

// Shown while the app is open: a banner and the list entry, with sound for the important channels.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

/** Android channels — the same ids the backend sends (services/mobile/mobilePush.service.ts channelFor). */
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  const channels: [string, string, AndroidImportance][] = [
    ["messages", t("push.channelMessages"), AndroidImportance.HIGH],
    ["assignments", t("push.channelAssignments"), AndroidImportance.HIGH],
    ["meetings", t("push.channelMeetings"), AndroidImportance.HIGH],
    ["sales", t("push.channelSales"), AndroidImportance.DEFAULT],
    ["ai", t("push.channelAi"), AndroidImportance.DEFAULT],
    ["general", t("push.channelGeneral"), AndroidImportance.DEFAULT],
  ];
  await Promise.all(channels.map(([id, name, importance]) => Notifications.setNotificationChannelAsync(id, { name, importance, lightColor: palettes.light.primary })));
}

export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

export async function pushPermission(): Promise<PushPermission> {
  if (!pushSupported) return "unsupported";
  const s = await Notifications.getPermissionsAsync();
  if (s.granted || s.ios?.status === IosAuthorizationStatus.PROVISIONAL) return "granted";
  return s.canAskAgain ? "undetermined" : "denied";
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

/**
 * Registers this phone with the backend if notifications are allowed. Silent and idempotent: safe to call on
 * every launch (the backend updates last_seen and moves the token if another person signed in).
 */
export async function registerForPush(): Promise<boolean> {
  if (!pushSupported) return false;
  await ensureChannels();
  if ((await pushPermission()) !== "granted") return false;
  const id = projectId();
  // Push tokens need the EAS project id (set when the app is linked to EAS for builds).
  if (!id) return false;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await devicesApi.register({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      app_version: Constants.expoConfig?.version ?? null,
      device_name: Device.deviceName ?? Device.modelName ?? null,
    });
    storage.set(TOKEN_KEY, token);
    return true;
  } catch (e) {
    // Expected on emulators without Play services and when notifications are off; only worth seeing while developing.
    if (__DEV__) console.warn("[push] registration failed:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * This phone's Expo push token when notifications are allowed (null otherwise, on emulators without Play
 * services, or before the app is linked to EAS). Used by customer sign-in, which registers with its own token.
 */
export async function expoPushToken(): Promise<string | null> {
  if (!pushSupported) return null;
  await ensureChannels();
  if ((await pushPermission()) !== "granted") return null;
  const id = projectId();
  if (!id) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch {
    return null;
  }
}

/** Asks the system for permission (after the user tapped "Turn on"), then registers. */
export async function askForPush(): Promise<PushPermission> {
  if (!pushSupported) return "unsupported";
  await ensureChannels();
  const s = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  const granted = s.granted || s.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  if (granted) await registerForPush();
  return granted ? "granted" : s.canAskAgain ? "undetermined" : "denied";
}

/** Removes this phone from the account on sign-out, so the next person's phone never gets your alerts. */
export async function unregisterPush(sessionToken: string): Promise<void> {
  const token = storage.getString(TOKEN_KEY);
  if (!token) return;
  storage.remove(TOKEN_KEY);
  await devicesApi.remove(token, sessionToken).catch(() => undefined);
  if (Platform.OS !== "web") await Notifications.setBadgeCountAsync(0).catch(() => false);
}

export function setAppBadge(count: number): void {
  if (pushSupported) void Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => false);
}

/** "Not now" on the in-app prompt: ask again after a week, never nag. */
export function dismissPushAsk(): void {
  storage.set(ASKED_KEY, Date.now());
}

export function pushAskDismissedRecently(): boolean {
  const at = storage.getNumber(ASKED_KEY);
  return at != null && Date.now() - at < 7 * 24 * 60 * 60_000;
}
