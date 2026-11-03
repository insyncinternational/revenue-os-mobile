import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { splitAlpha } from "@/theme/brand";

/**
 * Fills its parent with a diagonal gradient and an optional soft glow in the top-right corner.
 * Drawn with react-native-svg (already a dependency) — no gradient library.
 *
 * The drawing is sized from a measured layout, not "100%": on Android a percentage-sized SVG keeps its first size, so
 * a header that grew after its content loaded was left half painted.
 */
export function GradientFill({ from, to, glow, glowOpacity = 0.45, vertical }: { from: string; to: string; glow?: string; glowOpacity?: number; vertical?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Dark-theme surfaces are translucent rgba; a stop colour drops that alpha on Android, so it rides in stopOpacity.
  const start = splitAlpha(from);
  const end = splitAlpha(to);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((s) => (s && s.w === width && s.h === height ? s : { w: width, h: height }));
      }}
    >
      {size ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {/* Diagonal for heroes; vertical to fade a wash into the page below it. */}
            <LinearGradient id={`lg${id}`} x1="0" y1="0" x2={vertical ? "0" : "1"} y2="1">
              <Stop offset="0" stopColor={start.color} stopOpacity={start.opacity} />
              <Stop offset="1" stopColor={end.color} stopOpacity={end.opacity} />
            </LinearGradient>
            {glow ? (
              <RadialGradient id={`rg${id}`} cx="0.92" cy="0.05" rx="0.75" ry="0.9" fx="0.92" fy="0.05">
                <Stop offset="0" stopColor={glow} stopOpacity={glowOpacity} />
                <Stop offset="1" stopColor={glow} stopOpacity={0} />
              </RadialGradient>
            ) : null}
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#lg${id})`} />
          {glow ? <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#rg${id})`} /> : null}
        </Svg>
      ) : (
        // Until measured: the start colour, so nothing flashes white.
        <View style={[StyleSheet.absoluteFill, { backgroundColor: from }]} />
      )}
    </View>
  );
}
