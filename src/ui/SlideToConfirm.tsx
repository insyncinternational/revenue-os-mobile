import { useEffect, useState } from "react";
import { I18nManager, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { ArrowRight, Check, ICON_STROKE } from "./icons";
import { Text } from "./Text";

const HEIGHT = 56;
const PAD = 6;
const KNOB = HEIGHT - PAD * 2;
/** How far (share of the track) the knob must travel to count. */
const THRESHOLD = 0.82;

/**
 * "Slide to mark done" for the accent card: a glass track (light, see-through) with a white knob that nudges now
 * and then to show it moves. Dragging it to
 * the end confirms (with a haptic and a check); letting go early springs it back, so a stray tap never completes
 * anything. Screen readers get one button that confirms on activate.
 */
export function SlideToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const x = useSharedValue(0);
  const nudge = useSharedValue(0);
  const max = Math.max(1, width - KNOB - PAD * 2);
  const dir = I18nManager.isRTL ? -1 : 1;

  useEffect(() => {
    if (reduce || done) return;
    nudge.set(withDelay(1200, withRepeat(withSequence(withTiming(0, { duration: 1400 }), withTiming(10, { duration: 220 }), withSpring(0, { damping: 6, stiffness: 180 })), -1)));
  }, [reduce, done, nudge]);

  const confirm = () => {
    setDone(true);
    haptics.success();
    onConfirm();
  };

  const pan = usePanGesture({
    enabled: !done && width > 0,
    activeOffsetX: [-8, 8],
    onUpdate: (e) => {
      "worklet";
      nudge.set(0);
      x.set(Math.min(max, Math.max(0, e.translationX * dir)));
    },
    onDeactivate: () => {
      "worklet";
      if (x.get() >= max * THRESHOLD) {
        x.set(withTiming(max, { duration: 120 }));
        scheduleOnRN(confirm);
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 220 }));
      }
    },
  });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: (x.get() + nudge.get()) * dir }] }));
  const hint = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, max * 0.6], [1, 0], Extrapolation.CLAMP) }));
  const trail = useAnimatedStyle(() => ({ width: x.get() + KNOB }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: done }}
      onAccessibilityTap={done ? undefined : confirm}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={() => (done ? undefined : confirm())}
      style={[styles.track, { backgroundColor: colors.primaryTrack, borderColor: colors.primaryTrack }]}
    >
      <Animated.View style={[styles.hint, hint]} pointerEvents="none">
        <Text variant="callout" weight="medium" style={{ color: colors.onPrimary, opacity: 0.85 }} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.trail, { backgroundColor: colors.onPrimary }, trail]} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, { backgroundColor: colors.onPrimary }, knob]}>
          {done ? <Check size={20} color={colors.primaryFill} strokeWidth={ICON_STROKE + 0.75} /> : <ArrowRight size={19} color={colors.primaryFill} strokeWidth={ICON_STROKE + 0.5} />}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: HEIGHT / 2, padding: PAD, justifyContent: "center", overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  hint: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingStart: KNOB + space.sm },
  trail: { position: "absolute", start: PAD, top: PAD, height: KNOB, borderRadius: KNOB / 2, opacity: 0.22 },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.18)" },
});
