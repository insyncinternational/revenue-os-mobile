import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Area, type Palette } from "@/theme/tokens";
import { t } from "@/i18n";
import { Button } from "./Button";
import { CircleAlert, ICON_STROKE, RefreshCw, Sparkles, WifiOff, type IconComponent } from "./icons";
import { Text } from "./Text";

/** `area`: which part of the app this is (every scene uses the one accent). */
type EmptyProps = { icon: IconComponent; title: string; message?: string; actionLabel?: string; onAction?: () => void; area?: Area };

/** Empty list or screen: always says what to do next. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, area }: EmptyProps) {
  return (
    <View style={styles.wrap}>
      <Illustration Icon={Icon} area={area} />
      <Text variant="headline" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="subhead" tone="muted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

type Tone = { bg: keyof Palette; fg: keyof Palette };

const BRAND: Tone = { bg: "primarySubtle", fg: "primary" };

/**
 * The empty state's little scene: a soft colour blob, two tilted cards with the icon on the front one, and a
 * sparkle and dots that drift at their own pace. Still when Reduce Motion is on.
 */
function Illustration({ Icon, area }: { Icon: IconComponent; area?: Area }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  // One accent across the app (Mono look): the brand tint for every scene.
  const tone = BRAND;
  // The area's accent when given, else the icon's own tone.
  const fg = colors[tone.fg];
  const bg = colors[tone.bg];
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const enter = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    enter.set(withSpring(1, { damping: 12, stiffness: 140 }));
    a.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
    b.set(withRepeat(withTiming(1, { duration: 3100, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, a, b, enter]);
  const front = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: -5 * a.value + (1 - enter.value) * 12 }, { rotate: "4deg" }, { scale: 0.9 + enter.value * 0.1 }] }));
  const back = useAnimatedStyle(() => ({ opacity: enter.value * 0.9, transform: [{ translateY: 3 * b.value }, { rotate: "-9deg" }] }));
  const blob = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + 0.08 * b.value }] }));
  const spark = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: -6 * b.value }, { rotate: `${20 * a.value}deg` }] }));
  const dotA = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: 5 * a.value }] }));
  const dotB = useAnimatedStyle(() => ({ opacity: enter.value * 0.7, transform: [{ translateX: -4 * b.value }] }));
  return (
    <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.blob, { backgroundColor: bg }, blob]} />
      <Animated.View style={[styles.card, styles.backCard, { backgroundColor: colors.surface, borderColor: colors.border }, back]}>
        <View style={[styles.line, { backgroundColor: colors.surfaceTertiary, width: 34 }]} />
        <View style={[styles.line, { backgroundColor: colors.surfaceTertiary, width: 22 }]} />
      </Animated.View>
      <Animated.View style={[styles.card, styles.frontCard, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.cardShadow }, front]}>
        <View style={[styles.iconDisc, { backgroundColor: bg }]}>
          <Icon size={26} color={fg} strokeWidth={ICON_STROKE} />
        </View>
        <View style={[styles.line, { backgroundColor: colors.surfaceTertiary, width: 40 }]} />
      </Animated.View>
      <Animated.View style={[styles.spark, spark]}>
        <Sparkles size={16} color={fg} strokeWidth={ICON_STROKE} />
      </Animated.View>
      <Animated.View style={[styles.dotA, { backgroundColor: fg }, dotA]} />
      <Animated.View style={[styles.dotB, { backgroundColor: colors.primaryBorder }, dotB]} />
    </View>
  );
}

/** Failed load: friendly message + Retry. Never raw error text. */
export function ErrorState({ message, onRetry, offline }: { message?: string; onRetry?: () => void; offline?: boolean }) {
  const { colors } = useTheme();
  const Icon = offline ? WifiOff : CircleAlert;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: offline ? colors.surfaceTertiary : colors.dangerSurface }]}>
        <Icon size={26} color={offline ? colors.textMuted : colors.danger} strokeWidth={ICON_STROKE} />
      </View>
      <Text variant="headline" align="center">
        {offline ? t("state.offlineTitle") : t("state.errorTitle")}
      </Text>
      <Text variant="subhead" tone="muted" align="center" style={styles.message}>
        {message ?? (offline ? t("state.offlineMessage") : t("state.errorMessage"))}
      </Text>
      {onRetry ? <Button label={t("common.retry")} icon={RefreshCw} variant="secondary" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

/** Thin banner under the header while offline; cached data stays visible below it. */
export function OfflineBanner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.surfaceTertiary }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiOff size={14} color={colors.textSecondary} strokeWidth={2} />
      <Text variant="footnote" tone="secondary" weight="medium">
        {t("state.offlineBanner")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: gutter * 2, paddingVertical: space.huge, gap: space.sm },
  iconRing: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  scene: { width: 150, height: 116, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  blob: { position: "absolute", width: 116, height: 104, borderRadius: 52 },
  card: { position: "absolute", borderRadius: radius.lg, borderWidth: 1, padding: space.sm + 2, gap: 6 },
  backCard: { width: 70, height: 72, left: 18, top: 22, justifyContent: "flex-end" },
  frontCard: { width: 78, height: 84, left: 54, top: 12, alignItems: "flex-start" },
  iconDisc: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  line: { height: 6, borderRadius: 3 },
  spark: { position: "absolute", right: 6, top: 4 },
  dotA: { position: "absolute", width: 8, height: 8, borderRadius: 4, left: 14, top: 12 },
  dotB: { position: "absolute", width: 6, height: 6, borderRadius: 3, right: 18, bottom: 12 },
  message: { maxWidth: 300 },
  action: { marginTop: space.md, alignSelf: "center" },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs + 2, paddingVertical: space.xs + 2 },
});
