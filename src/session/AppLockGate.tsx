import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Fingerprint, ScanFace } from "@/ui/icons";
import { Logo } from "@/ui/Logo";
import { Text } from "@/ui/Text";
import { biometricKind, confirmOwner, useAppLock, type BiometricKind } from "./appLock";
import { useSession } from "./sessionStore";

/**
 * Covers the signed-in app while it's locked and asks for Face ID / fingerprint at once. Tracks the app going to
 * the background (only "background": the Face ID sheet itself makes the app "inactive", which must not count).
 */
/** Unlocks after Face ID / fingerprint — or straight away if biometrics were removed from the phone since the lock was
 * turned on (never trap the owner). */
async function askOwner(): Promise<void> {
  if ((await biometricKind()) == null || (await confirmOwner(t("lock.prompt"), t("common.cancel")))) {
    haptics.success();
    useAppLock.getState().unlock();
  }
}

export function AppLockGate() {
  const { colors } = useTheme();
  const locked = useAppLock((s) => s.locked);
  const enabled = useAppLock((s) => s.enabled);
  const signOut = useSession((s) => s.signOut);
  const [kind, setKind] = useState<BiometricKind | null>(null);
  const asking = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") useAppLock.getState().wentToBackground();
      else if (s === "active") useAppLock.getState().cameBack();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (enabled) void biometricKind().then(setKind);
  }, [enabled]);

  // A promise chain rather than try/finally, which the React Compiler can't yet compile.
  const unlock = useCallback(() => {
    if (asking.current) return Promise.resolve();
    asking.current = true;
    return askOwner().finally(() => {
      asking.current = false;
    });
  }, []);

  // Ask as soon as the cover appears with the app in front.
  useEffect(() => {
    if (locked && AppState.currentState === "active") void unlock();
  }, [locked, unlock]);

  if (!locked) return null;
  const Icon = kind === "face" ? ScanFace : Fingerprint;
  // A native modal, so it also covers open sheets (an overlay view would sit under them on iOS).
  return (
    <Modal visible animationType="none" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={[styles.cover, { backgroundColor: colors.background }]} accessibilityViewIsModal>
        <Logo height={36} />
        <View style={styles.middle}>
          <View style={[styles.ring, { backgroundColor: colors.primarySubtle }]}>
            <Icon size={34} color={colors.primary} strokeWidth={1.75} />
          </View>
          <Text variant="title" align="center">
            {t("lock.title")}
          </Text>
          <Text variant="subhead" tone="muted" align="center">
            {t("lock.message")}
          </Text>
          <Button label={kind === "face" ? t("lock.unlockFace") : t("lock.unlock")} icon={Icon} size="lg" onPress={() => void unlock()} style={styles.button} />
        </View>
        <Button label={t("more.signOut")} variant="ghost" onPress={() => void signOut()} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: gutter * 2, paddingTop: 96, paddingBottom: 56 },
  middle: { alignItems: "center", gap: space.md },
  ring: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  button: { alignSelf: "center", marginTop: space.lg },
});
