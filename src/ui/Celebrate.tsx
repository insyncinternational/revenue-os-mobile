import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

type Particle = { id: number; vx: number; vy: number; spin: number; size: number; round: boolean; color: string; delay: number };
type Burst = { id: number; particles: Particle[] };

const CelebrateContext = createContext<() => void>(() => undefined);

const COUNT = 28;
const DURATION = 1300;

/**
 * A short confetti burst for the moments worth it (deal won, invoice paid). Drawn with Reanimated on a layer above
 * everything that never takes touches; skipped when the phone asks for reduced motion (the haptic still plays).
 */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState<Burst | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palette = useMemo(() => [colors.primary, colors.success, colors.warning, colors.info, colors.heroGlow, colors.primaryBorder], [colors]);

  const celebrate = useCallback(() => {
    if (reduce) return;
    seq.current += 1;
    const particles = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      vx: (Math.random() * 2 - 1) * 0.55,
      vy: -(0.35 + Math.random() * 0.5),
      spin: (Math.random() * 2 - 1) * 540,
      size: 6 + Math.random() * 6,
      round: Math.random() < 0.35,
      color: palette[i % palette.length]!,
      delay: Math.random() * 90,
    }));
    setBurst({ id: seq.current, particles });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBurst(null), DURATION + 200);
  }, [reduce, palette]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {burst ? (
        <View key={burst.id} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
          {burst.particles.map((p) => (
            <Piece key={p.id} p={p} />
          ))}
        </View>
      ) : null}
    </CelebrateContext.Provider>
  );
}

/** One piece: thrown up and out from the upper middle of the screen, falls back, spins and fades. */
function Piece({ p }: { p: Particle }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => t.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) })), p.delay);
    return () => clearTimeout(id);
  }, [t, p.delay]);
  const style = useAnimatedStyle(() => {
    const k = t.get();
    return {
      opacity: k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35,
      transform: [
        { translateX: width / 2 + p.vx * width * k },
        { translateY: height * 0.32 + (p.vy * k + 0.9 * k * k) * height * 0.45 },
        { rotate: `${p.spin * k}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.piece, { width: p.size, height: p.round ? p.size : p.size * 1.6, borderRadius: p.round ? p.size / 2 : 2, backgroundColor: p.color }, style]} />;
}

/** Fire a celebration burst. */
export function useCelebrate(): () => void {
  return useContext(CelebrateContext);
}

const styles = StyleSheet.create({
  layer: { zIndex: 2000, elevation: 20 },
  piece: { position: "absolute", left: 0, top: 0 },
});
