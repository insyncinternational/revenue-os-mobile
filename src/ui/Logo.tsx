/**
 * The GrowthReach.ai logo — the mark (dark hexagon "G" with an orange arrow rising through it) and the
 * GrowthReach.ai wordmark, drawn from the same outlined geometry as the web
 * (revenue-os-frontend/components/ui/AppBrandLogo.tsx, lib/brandGeometry.ts).
 */
import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";
import { BRAND_COLORS, BRAND_GEOMETRY as G } from "./brandGeometry";

/** Same colours as the web logo (not themeable: this is the GrowthReach.ai brand, not an agency's). */
export const LOGO = {
  light: { ink: BRAND_COLORS.ink, accent: BRAND_COLORS.orange, sub: BRAND_COLORS.ink },
  dark: { ink: BRAND_COLORS.inkOnDark, accent: BRAND_COLORS.orange, sub: BRAND_COLORS.taglineOnDark },
  /** On the indigo splash, launch and sign-in hero: a white G with the orange accents, in both themes. */
  onBrand: { ink: "#ffffff", accent: BRAND_COLORS.orange, sub: "rgba(255, 255, 255, 0.78)" },
} as const;

/** "auto" follows light/dark; "onBrand" is for indigo backgrounds. */
export type LogoTone = "auto" | "onBrand";

function useLogoColors(tone: LogoTone) {
  const { scheme } = useTheme();
  return LOGO[tone === "onBrand" ? "onBrand" : scheme];
}

/** The arrow's orange, top to bottom. */
export function BrandOrange({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={BRAND_COLORS.orangeTop} />
        <Stop offset="1" stopColor={BRAND_COLORS.orangeBottom} />
      </LinearGradient>
    </Defs>
  );
}

function useGradId() {
  return `gro${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function BrandMark({ size = 32, tone = "auto" }: { size?: number; tone?: LogoTone }) {
  const c = useLogoColors(tone);
  const id = useGradId();
  const fill = `url(#${id})`;
  return (
    <Svg width={size} height={size} viewBox={G.markViewBox}>
      <BrandOrange id={id} />
      <Path d={G.g} fill={c.ink} />
      <Path d={G.arrow} fill={fill} />
    </Svg>
  );
}

const [, , LW, LH] = G.lockupViewBox.split(" ").map(Number) as [number, number, number, number];

/** Mark, "GrowthReach.ai" and "INTELLIGENCE AT SCALE" under the name. */
export function Logo({ height = 40, tagline = true, tone = "auto" }: { height?: number; tagline?: boolean; tone?: LogoTone }) {
  const c = useLogoColors(tone);
  const id = useGradId();
  const fill = `url(#${id})`;
  // The tagline is part of the logo: always drawn unless a caller turns it off.
  const showTag = tagline;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${APP_BRAND_NAME}, ${APP_BRAND_TAGLINE}`}>
      <Svg width={Math.round((height * LW) / LH)} height={height} viewBox={G.lockupViewBox}>
        <BrandOrange id={id} />
        <Path d={G.g} fill={c.ink} />
        <Path d={G.arrow} fill={fill} />
        <Path d={G.name} fill={c.ink} />
        <Path d={G.ai} fill={c.accent} />
        {showTag ? <Path d={G.tagline} fill={c.sub} /> : null}
      </Svg>
    </View>
  );
}
