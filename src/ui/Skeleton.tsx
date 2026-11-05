import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, useReducedMotion, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { t } from "@/i18n";

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

/**
 * Rows while a list loads, in the same white rounded card the real lists use (`bare`: on the page, for lists
 * that are not in a card, such as People and a chat).
 */
export function SkeletonList({ rows = 8, avatar = true, bare = false }: { rows?: number; avatar?: boolean; bare?: boolean }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar" style={bare ? null : [styles.card, { backgroundColor: colors.surface }]}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} avatar={avatar} />
      ))}
    </View>
  );
}

/** A client card while the Clients list loads: avatar and name, the numbers strip, the reason line. */
export function SkeletonClientCards({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar" style={styles.stack}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.card, styles.clientCard, { backgroundColor: colors.surface }]}>
          <View style={styles.clientTop}>
            <Skeleton width={44} height={44} round />
            <View style={styles.body}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="45%" height={12} />
            </View>
            <Skeleton width={64} height={24} round />
          </View>
          <Skeleton width="100%" height={54} />
          <Skeleton width="50%" height={12} />
        </View>
      ))}
    </View>
  );
}

/** Deals while the board loads: its header line, the big amount, the two pills, the chart card and a deal. */
export function SkeletonPipeline() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar" style={[styles.stack, { paddingTop: insets.top + space.md }]}>
      <View style={styles.pad}>
        <Skeleton width={150} height={14} />
        <Skeleton width={230} height={48} />
        <View style={styles.pills}>
          <Skeleton width={130} height={32} round />
          <Skeleton width={150} height={32} round />
        </View>
      </View>
      <View style={[styles.card, styles.pad, styles.chart, { backgroundColor: colors.surface }]}>
        <Skeleton width="100%" height={150} />
      </View>
      <View style={[styles.pad, styles.section]}>
        <Skeleton width={90} height={20} />
      </View>
      <View style={[styles.card, styles.hero]}>
        <Skeleton width="100%" height={120} />
      </View>
    </View>
  );
}

/** A screen with a hero card on top and rows under it (a client's page, a deal), while it loads. */
export function SkeletonDetail({ rows = 4 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar" style={styles.stack}>
      <View style={[styles.card, styles.hero]}>
        <Skeleton width="100%" height={180} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
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
  card: { marginHorizontal: gutter, borderRadius: radius.xl + 4, overflow: "hidden", paddingVertical: space.xs },
  stack: { gap: space.sm + 2 },
  clientCard: { padding: space.lg, gap: space.md },
  clientTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  hero: { borderRadius: radius.xxl, paddingVertical: 0 },
  pad: { paddingHorizontal: gutter, gap: space.sm },
  pills: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  chart: { marginHorizontal: gutter, paddingVertical: space.lg },
  section: { marginTop: space.sm },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: gutter, paddingVertical: space.md, gap: space.md, minHeight: 64 },
  body: { flex: 1, gap: space.sm },
  line: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
});
