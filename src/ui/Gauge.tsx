import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * A half-circle meter (0–1) that sweeps from left to right, like a speedometer: "68% weighted", goal progress.
 * `children` sit centred in the bowl (the number and its label). Same drawing and timing as Ring.
 */
export function Gauge({ value, size = 160, stroke = 12, color, track, delay = 200, children }: { value: number; size?: number; stroke?: number; color: string; track: string; delay?: number; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const length = Math.PI * r;
  const height = r + stroke;
  const clamped = Math.min(1, Math.max(0, value));
  const p = useSharedValue(reduce ? clamped : 0);
  useEffect(() => {
    p.set(reduce ? clamped : withDelay(delay, withTiming(clamped, { duration: 900, easing: EASE })));
  }, [clamped, delay, reduce, p]);
  // A round cap draws a dot even with nothing to fill: hidden at 0.
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value), strokeOpacity: p.value > 0.001 ? 1 : 0 }));
  // Left end → over the top → right end; the base line runs through the stroke's centre.
  const arc = `M ${stroke / 2} ${r + stroke / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${r + stroke / 2}`;
  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height}>
        <Path d={arc} stroke={track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <AnimatedPath d={arc} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${length} ${length}`} animatedProps={props} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: stroke * 2 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "flex-end" },
});
