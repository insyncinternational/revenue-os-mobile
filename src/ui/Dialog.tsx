import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Button } from "./Button";
import { Text } from "./Text";

/** One choice in a dialog. "cancel" closes it (also on Back or a tap outside); "destructive" is shown in red. */
export type DialogAction = { label: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };
export type DialogRequest = { title?: string; message?: string; actions: DialogAction[] };

const useDialog = create<{ request: DialogRequest | null; open: (r: DialogRequest) => void; close: () => void }>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));

/** Shows a branded dialog: the app's own look instead of the system alert. Only one at a time. */
export function showDialog(request: DialogRequest): void {
  useDialog.getState().open(request);
}

/**
 * Drawn once at the root, above every screen and sheet: a card rising from the bottom with the question and its
 * choices as full-width pills (main choice first, Cancel last), the same in light, dark and every brand colour.
 */
export function DialogHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const request = useDialog((s) => s.request);
  const close = useDialog((s) => s.close);
  const cancel = request?.actions.find((a) => a.style === "cancel");

  useEffect(() => {
    if (request?.actions.some((a) => a.style === "destructive")) haptics.warning();
  }, [request]);

  const pick = (a: DialogAction | undefined) => {
    close();
    a?.onPress?.();
  };

  const ordered = request ? [...request.actions.filter((a) => a.style !== "cancel"), ...(cancel ? [cancel] : [])] : [];

  return (
    <Modal visible={!!request} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => pick(cancel)}>
      {request ? (
        <View style={styles.fill}>
          <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} exiting={reduce ? undefined : FadeOut.duration(140)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => pick(cancel)} accessibilityRole="button" accessibilityLabel={cancel?.label} />
          </Animated.View>
          <Animated.View
            entering={reduce ? undefined : SlideInDown.springify().damping(22).stiffness(260)}
            exiting={reduce ? undefined : SlideOutDown.duration(160)}
            accessibilityViewIsModal
            accessibilityRole="alert"
            style={[styles.card, { backgroundColor: colors.surface, marginBottom: Math.max(insets.bottom, space.md) + space.sm, boxShadow: colors.cardShadow }]}
          >
            {request.title ? (
              <Text variant="headline" align="center">
                {request.title}
              </Text>
            ) : null}
            {request.message ? (
              <Text variant={request.title ? "subhead" : "headline"} tone={request.title ? "secondary" : "default"} align="center" style={request.title ? styles.message : undefined}>
                {request.message}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {ordered.map((a, i) => (
                <Button
                  key={`${i}-${a.label}`}
                  label={a.label}
                  fullWidth
                  size="lg"
                  variant={a.style === "cancel" ? "secondary" : a.style === "destructive" ? "danger" : i === 0 ? "primary" : "secondary"}
                  onPress={() => pick(a)}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  card: { marginHorizontal: gutter - space.sm, borderRadius: radius.xxl, padding: space.xl, paddingTop: space.xxl, gap: space.xs },
  message: { marginTop: space.xs },
  actions: { marginTop: space.lg, gap: space.sm },
});
