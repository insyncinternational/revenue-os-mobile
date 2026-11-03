import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** A progress ring (0–1) that sweeps in from the top; children sit in the middle (a % or an icon). */
export function Ring({ value, size = 56, stroke = 6, color, track, delay = 200, children }: { value: number; size?: number; stroke?: number; color: string; track: string; delay?: number; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const p = useSharedValue(reduce ? clamped : 0);
  useEffect(() => {
    p.set(reduce ? clamped : withDelay(delay, withTiming(clamped, { duration: 900, easing: EASE })));
  }, [clamped, delay, reduce, p]);
  // A round cap draws a dot even with nothing to fill: hidden at 0.
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value), strokeOpacity: p.value > 0.001 ? 1 : 0 }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${length} ${length}`} animatedProps={props} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Starts at 12 o'clock.
  rotate: { transform: [{ rotate: "-90deg" }] },
  center: { alignItems: "center", justifyContent: "center" },
});
