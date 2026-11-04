import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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
import { useLaunch } from "@/session/launch";
import { launchBrand } from "@/theme/tokens";
import { GradientFill } from "./Gradient";
import { BrandOrange, LOGO } from "./Logo";
import { BRAND_GEOMETRY as G } from "./brandGeometry";

/** The native splash's mark size (app.json expo-splash-screen imageWidth), so the hand-off is invisible. */
const MARK = 96;
const [VX, VY, VS] = G.markViewBox.split(" ").map(Number) as [number, number, number];
const K = MARK / VS; // mark viewBox units → px
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const c = LOGO.onBrand;

/** The three orange bars inside the G as views (so each can move on the UI thread), same geometry as BrandMark. */
const BARS = G.bars.map((d) => {
  const [x, y, w, h] = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number) as [number, number, number, number];
  return { x: x - VX, y: y - VY, w, h };
});
/** The name + tagline part of the lockup (right of the divider). */
const WORDS_VB = "570 130 1400 230";
const WORDS_W = 260;

/**
 * The first thing after the native splash, once per cold start:
 *  - "full" (signed out, ~1.6 s): the bars bounce up one after another, the arrow shoots out, the indigo gradient glows in,
 *    the mark lifts and GrowthReach.ai / tagline slide in under it, then everything rises away into the sign-in page.
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
  const arrow = useSharedValue(1);
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
    // Bars dip and spring back up, left to right, like a level meter; the arrow then shoots out of the G.
    bars.forEach((b, i) =>
      b.set(withDelay(120 + i * 90, withSequence(withTiming(0.3, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9, stiffness: 180 }))))
    );
    arrow.set(withDelay(330, withSequence(withTiming(0, { duration: 1 }), withSpring(1, { damping: 11, stiffness: 160 }))));
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
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, arrow.value * 1.6),
    transform: [{ translateX: (arrow.value - 1) * 22 }, { translateY: (1 - arrow.value) * 22 }],
  }));

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
          <Svg width={MARK} height={MARK} viewBox={G.markViewBox} style={StyleSheet.absoluteFill}>
            <Path d={G.g} fill={c.ink} />
          </Svg>
          {BARS.map((b, i) => (
            <Bar key={i} bar={b} value={bars[i]!} />
          ))}
          <Animated.View style={[StyleSheet.absoluteFill, arrowStyle]}>
            <Svg width={MARK} height={MARK} viewBox={G.markViewBox}>
              <BrandOrange id="launchArrow" />
              <Path d={G.arrow} fill="url(#launchArrow)" />
            </Svg>
          </Animated.View>
        </View>
        {mode === "full" ? (
          <Animated.View style={[styles.words, wordmark]}>
            <Svg width={WORDS_W} height={(WORDS_W * 230) / 1400} viewBox={WORDS_VB}>
              <BrandOrange id="launchWords" />
              <Path d={G.name} fill={c.ink} />
              <Path d={G.ai} fill="url(#launchWords)" />
              {G.dashes.map((d) => (
                <Path key={d} d={d} fill="url(#launchWords)" />
              ))}
              <Path d={G.tagline} fill={c.sub} />
            </Svg>
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
        { left: bar.x * K, top: bar.y * K, width: bar.w * K, height: bar.h * K, borderRadius: 1, backgroundColor: c.accent },
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
  words: { alignItems: "center", marginTop: 18 },
});
