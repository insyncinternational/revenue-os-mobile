/**
 * Optional Face ID / fingerprint lock (More → Account). When on, the signed-in app is covered on launch and after
 * a minute in the background, until the phone's biometrics (or its passcode, as the phone allows) confirm it's the
 * owner. The session itself is untouched — this is a screen lock, not a sign-out.
 */
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { create } from "zustand";
import { storage } from "@/lib/storage";

const PREF_KEY = "pref.appLock";
/** Back from the background within this long: no lock (switching apps to copy a code shouldn't lock you out). */
export const LOCK_AFTER_MS = 60_000;

export type BiometricKind = "face" | "fingerprint" | "other";

/** Pure: lock again after a trip to the background? */
export function shouldLockOnReturn(enabled: boolean, backgroundAt: number | null, now: number): boolean {
  return enabled && backgroundAt != null && now - backgroundAt >= LOCK_AFTER_MS;
}

/** What the phone offers, for the label ("Face ID", "Fingerprint"); null when nothing is set up. */
export async function biometricKind(): Promise<BiometricKind | null> {
  if (Platform.OS === "web") return null;
  const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  if (!hardware || !enrolled) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return pickBiometric(Platform.OS, types);
}

/**
 * Pure: the label to show. Android phones often list face and fingerprint, but the system prompt apps get asks
 * for the fingerprint (most Android face unlock is not strong enough for apps), so Android says fingerprint
 * whenever it has one. iPhones have one or the other, and Face ID is the face.
 */
export function pickBiometric(os: string, types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (os === "android") return finger ? "fingerprint" : face ? "face" : "other";
  return face ? "face" : finger ? "fingerprint" : "other";
}

/** Asks the phone. The passcode is allowed as the fallback, so a failed face scan never locks the owner out. */
export async function confirmOwner(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false });
  return res.success;
}

type AppLockState = {
  enabled: boolean;
  locked: boolean;
  backgroundAt: number | null;
  setEnabled: (on: boolean) => void;
  lock: () => void;
  unlock: () => void;
  wentToBackground: () => void;
  cameBack: () => void;
};

const startEnabled = storage.getBoolean(PREF_KEY) === true;

export const useAppLock = create<AppLockState>((set, get) => ({
  enabled: startEnabled,
  // Locked from the first frame on a cold start, so nothing shows before the check.
  locked: startEnabled,
  backgroundAt: null,
  setEnabled: (on) => {
    storage.set(PREF_KEY, on);
    set({ enabled: on, locked: false });
  },
  lock: () => set({ locked: get().enabled }),
  unlock: () => set({ locked: false, backgroundAt: null }),
  wentToBackground: () => {
    if (get().backgroundAt == null) set({ backgroundAt: Date.now() });
  },
  cameBack: () => {
    const { enabled, backgroundAt } = get();
    set({ locked: get().locked || shouldLockOnReturn(enabled, backgroundAt, Date.now()), backgroundAt: null });
  },
}));
