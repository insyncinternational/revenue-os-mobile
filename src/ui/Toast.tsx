import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, shadows, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { CheckCircle2, CircleAlert, ICON_STROKE } from "./icons";
import { Text } from "./Text";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string; action?: { label: string; onPress: () => void } };
type ToastApi = { show: (message: string, opts?: { kind?: ToastKind; action?: ToastItem["action"] }) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** One toast at a time, above the tab bar. Errors stay longer; an action (e.g. Undo) can be attached. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const kind = opts?.kind ?? "info";
    if (kind === "error") haptics.warning();
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, kind, message, action: opts?.action });
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 5000 : opts?.action ? 4500 : 2800);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDismiss={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const Icon = toast.kind === "error" ? CircleAlert : CheckCircle2;
  const iconColor = toast.kind === "error" ? colors.danger : toast.kind === "success" ? colors.success : colors.primary;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer, { paddingBottom: insets.bottom + 72 }]}>
      <Animated.View
        entering={FadeInUp.duration(190)}
        exiting={FadeOutDown.duration(130)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.surfaceInverse }]}
      >
        {toast.kind !== "info" ? <Icon size={18} color={iconColor} strokeWidth={ICON_STROKE + 0.25} /> : null}
        <Text variant="subhead" tone="inverse" weight="medium" style={styles.message} numberOfLines={3}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            onPress={() => {
              toast.action?.onPress();
              onDismiss();
            }}
          >
            <Text variant="subhead" weight="semibold" style={{ color: colors.primaryBorder }}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  layer: { justifyContent: "flex-end", alignItems: "center", paddingHorizontal: gutter },
  toast: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, maxWidth: 520, alignSelf: "stretch", shadowColor: shadows.neutral, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  message: { flex: 1 },
});
