import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Content rises into place on first render, staggered by `index`, so sections arrive in reading order instead
 * of popping in. Animates only opacity and translate (never layout), once per mount — data refreshes don't
 * replay it — and follows the system Reduce Motion setting.
 *
 * Deliberately not Reanimated's `entering` layout animations: on web they can leave the view absolutely
 * positioned when the screen re-renders mid-animation (seen 2026-11-01), which stacks sections on top of each other.
 *
 * `animate={false}`: shown at once, in the same wrapper (a list row past the first screenful). The rise plays at
 * most once per mount: a recycled list row that gets a new `index` never replays it.
 */
export function Reveal({
  index = 0,
  children,
  style,
  wait = false,
  animate = true,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  wait?: boolean;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  // Decided once, at mount: what this row was then, not what it is recycled into later.
  const [animated] = useState(() => animate && !reduce);
  const [firstIndex] = useState(index);
  const started = useRef(false);
  const progress = useSharedValue(animated ? 0 : 1);

  // `wait`: hold hidden until it turns false (e.g. while the launch intro still covers the screen).
  useEffect(() => {
    if (!animated || wait || started.current) return;
    started.current = true;
    progress.set(withDelay(Math.min(firstIndex, 8) * 55, withTiming(1, { duration: 420, easing: EASE })));
  }, [animated, firstIndex, progress, wait]);

  const rise = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return <Animated.View style={[style, rise]}>{children}</Animated.View>;
}
