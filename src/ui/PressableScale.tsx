import { createContext, useContext, type ReactNode, type RefObject } from "react";
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number };

/**
 * When the surrounding row last started a swipe (SwipeableRow sets it). A tap right after that is the end of the
 * swipe, not a tap: phones already cancel it, and this makes the web preview agree.
 */
export const SwipeStartedAt = createContext<RefObject<number> | null>(null);
const SWIPE_TAP_GUARD_MS = 600;

/** Tappable surface that sinks slightly under the finger and springs back (UI thread; off with Reduce Motion). */
export function PressableScale({ style, children, scaleTo = 0.97, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const swipeStartedAt = useContext(SwipeStartedAt);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduce) scale.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduce) scale.set(withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }));
        onPressOut?.(e);
      }}
      onPress={
        onPress
          ? (e: GestureResponderEvent) => {
              if (swipeStartedAt && Date.now() - swipeStartedAt.current < SWIPE_TAP_GUARD_MS) return;
              onPress(e);
            }
          : undefined
      }
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
