import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { StyleSheet, Text as RNText, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { APP_BRAND_TAGLINE } from "@/lib/brand";
import { useLaunch } from "@/session/launch";
import { fonts, launchBrand } from "@/theme/tokens";
import { GradientFill } from "./Gradient";
import { LOGO } from "./Logo";

/** The native splash's mark size (app.json expo-splash-screen imageWidth), so the hand-off is invisible. */
const MARK = 96;
const K = MARK / 40; // the mark's viewBox is 40
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const c = LOGO.onBrand;

/** The spark bars as views (so each can move on the UI thread), same geometry as BrandMark. */
const BARS = [
  { x: 6, y: 23, w: 7, h: 11, color: c.ink },
  { x: 15.5, y: 17, w: 7, h: 17, color: c.ink },
  { x: 25, y: 15, w: 7, h: 19, color: c.accent },
] as const;

/**
 * The first thing after the native splash, once per cold start:
 *  - "full" (signed out, ~1.6 s): the bars bounce up one after another, the dot hops, the indigo gradient glows in,
 *    the mark lifts and REVENUE OS / tagline slide in under it, then everything rises away into the sign-in page.
 *  - "short" (signed in, ~0.8 s): just the bounce, then straight to Today — nobody waits on every launch.
 * Reduce Motion: a plain fade. Runs entirely on the UI thread (Reanimated), so it stays smooth while JS loads.
 */
export function LaunchIntro({ mode, onShown }: { mode: "full" | "short"; onShown: () => void }) {
  const reduce = useReducedMotion();
  const finish = useLaunch((s) => s.finishIntro);
  const done = useLaunch((s) => s.introDone);
  // Opened straight onto a deeper screen (a tapped notification, a link): show it at once, no intro.
  const path = usePathname();
  const [skip] = useState(() => !["/", "/sign-in"].includes(path || "/"));

  const bars = [useSharedValue(1), useSharedValue(1), useSharedValue(1)];
  const dot = useSharedValue(0);
  const glow = useSharedValue(0);
  const lift = useSharedValue(0);
  const words = useSharedValue(0);
  const exit = useSharedValue(0);

  // Ends on time even if the animation is held up (a busy JS thread in the web preview): never lingers.
  // No cover to draw: the native splash can go now.
  useEffect(() => {
    if (done || skip) onShown();
  }, [done, skip, onShown]);

  useEffect(() => {
    if (done) return;
    if (skip) {
      finish();
      return;
    }
    const cap = setTimeout(finish, mode === "full" ? 2000 : 1000);
    return () => clearTimeout(cap);
  }, [done, skip, mode, finish]);

  useEffect(() => {
    if (done || skip) return;
    const end = () => {
      "worklet";
      runOnJS(finish)();
    };
    if (reduce) {
      exit.set(withDelay(150, withTiming(1, { duration: 220 }, (ok) => ok && end())));
      return;
    }
    // Bars dip and spring back up, left to right, like a level meter; the dot hops after the tall bar.
    bars.forEach((b, i) =>
      b.set(withDelay(120 + i * 90, withSequence(withTiming(0.3, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9, stiffness: 180 }))))
    );
    dot.set(withDelay(400, withSequence(withTiming(-14, { duration: 170, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 7, stiffness: 200 }))));
    if (mode === "short") {
      exit.set(withDelay(620, withTiming(1, { duration: 240, easing: EASE }, (ok) => ok && end())));
      return;
    }
    glow.set(withDelay(420, withTiming(1, { duration: 600, easing: EASE })));
    lift.set(withDelay(560, withTiming(1, { duration: 520, easing: EASE })));
    words.set(withDelay(680, withTiming(1, { duration: 480, easing: EASE })));
    exit.set(withDelay(1320, withTiming(1, { duration: 360, easing: EASE }, (ok) => ok && end())));
    // Shared values are stable; this runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cover = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const gradient = useAnimatedStyle(() => ({ opacity: glow.value }));
  const group = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 34 - exit.value * 28 }, { scale: 1 - lift.value * 0.12 }],
  }));
  const wordmark = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: (1 - words.value) * 14 }] }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dot.value }] }));

  if (done || skip) return null;
  return (
    <Animated.View
      // The native splash hands over only once this cover is on screen — hiding it sooner flashed the bare app for a frame.
      onLayout={() => requestAnimationFrame(onShown)}
      style={[StyleSheet.absoluteFill, styles.cover, cover]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, gradient]}>
        <GradientFill from={launchBrand.splash} to={launchBrand.to} glow={launchBrand.glow} glowOpacity={0.5} />
      </Animated.View>
      <Animated.View style={[styles.group, group]}>
        <View style={styles.mark}>
          {BARS.map((b, i) => (
            <Bar key={i} bar={b} value={bars[i]!} />
          ))}
          <Animated.View style={[styles.dot, dotStyle]} />
        </View>
        {mode === "full" ? (
          <Animated.View style={[styles.words, wordmark]}>
            <RNText allowFontScaling={false} style={styles.name}>
              REVENUE <RNText style={{ color: c.accent }}>OS</RNText>
            </RNText>
            <RNText allowFontScaling={false} style={styles.tagline}>
              {APP_BRAND_TAGLINE.toUpperCase()}
            </RNText>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function Bar({ bar, value }: { bar: (typeof BARS)[number]; value: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: value.value }] }));
  return (
    <Animated.View
      style={[
        styles.bar,
        { left: bar.x * K, top: bar.y * K, width: bar.w * K, height: bar.h * K, borderRadius: 3.5 * K, backgroundColor: bar.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cover: { zIndex: 2000, backgroundColor: launchBrand.splash, alignItems: "center", justifyContent: "center" },
  group: { alignItems: "center" },
  mark: { width: MARK, height: MARK },
  // Grows from its base, like the bars on a chart.
  bar: { position: "absolute", transformOrigin: "bottom" },
  dot: { position: "absolute", left: (28.5 - 3.6) * K, top: (7.5 - 3.6) * K, width: 7.2 * K, height: 7.2 * K, borderRadius: 3.6 * K, backgroundColor: c.accent },
  words: { alignItems: "center", marginTop: 18, gap: 8 },
  name: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, color: c.ink, letterSpacing: 0.4 },
  tagline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: c.sub, letterSpacing: 4.2 },
});
