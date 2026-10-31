import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, useReducedMotion, Easing } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";

/** Placeholder block with a slow pulse (static when "Reduce motion" is on). */
export function Skeleton({ width = "100%", height = 14, round = false }: { width?: DimensionValue; height?: number; round?: boolean }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: round ? height / 2 : radius.sm, backgroundColor: colors.skeleton }, pulse]} />;
}

/** Skeleton shaped exactly like a ListRow, so nothing jumps when the real rows arrive. */
export function SkeletonRow({ avatar = true }: { avatar?: boolean }) {
  return (
    <View style={styles.row}>
      {avatar ? <Skeleton width={40} height={40} round /> : null}
      <View style={styles.body}>
        <View style={styles.line}>
          <Skeleton width="55%" height={15} />
          <Skeleton width={36} height={12} />
        </View>
        <Skeleton width="80%" height={13} />
      </View>
    </View>
  );
}

export function SkeletonList({ rows = 8, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} avatar={avatar} />
      ))}
    </View>
  );
}

/**
 * Shows `fallback` only if loading lasts longer than `delay` ms. Fast loads show nothing, then the content —
 * no skeleton flash.
 */
export function DelayedFallback({ delay = 150, children }: { delay?: number; children: ReactNode }) {
  const [show, setShow] = useState(delay === 0);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return show ? <>{children}</> : null;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: gutter, paddingVertical: space.md, gap: space.md, minHeight: 64 },
  body: { flex: 1, gap: space.sm },
  line: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
});
