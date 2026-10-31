/**
 * The Revenue OS logo — the "spark bars" mark and the REVENUE OS wordmark, drawn from the same geometry as the web
 * (revenue-os-frontend/components/ui/AppBrandLogo.tsx).
 */
import { StyleSheet, Text as RNText, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";

/** Same colours as the web wordmark (not themeable: this is the Revenue OS brand, not an agency's). */
const LOGO = {
  light: { ink: "#0f172a", accent: "#4f46e5", sub: "#475569" },
  dark: { ink: "#f1f5f9", accent: "#818cf8", sub: "#a5b4fc" },
} as const;

export function BrandMark({ size = 32 }: { size?: number }) {
  const { scheme } = useTheme();
  const c = LOGO[scheme];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={6} y={23} width={7} height={11} rx={3.5} fill={c.ink} />
      <Rect x={15.5} y={17} width={7} height={17} rx={3.5} fill={c.ink} />
      <Rect x={25} y={15} width={7} height={19} rx={3.5} fill={c.accent} />
      <Circle cx={28.5} cy={7.5} r={3.6} fill={c.accent} />
    </Svg>
  );
}

/** Mark + "REVENUE OS" (+ tagline spread under the name when there is room). */
export function Logo({ height = 40, tagline = true }: { height?: number; tagline?: boolean }) {
  const { scheme } = useTheme();
  const c = LOGO[scheme];
  const mark = Math.round(height * 0.78);
  const nameSize = Math.round(mark * 0.56);
  const tagSize = Math.max(8, Math.round(nameSize * 0.4));
  const showTag = tagline && height >= 30;
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel={`${APP_BRAND_NAME}, ${APP_BRAND_TAGLINE}`}>
      <BrandMark size={mark} />
      <View style={{ marginLeft: Math.round(mark * 0.32) }}>
        <RNText allowFontScaling={false} style={{ fontFamily: fonts.extrabold, fontSize: nameSize, lineHeight: Math.round(nameSize * 1.1), color: c.ink, letterSpacing: nameSize * 0.005 }}>
          REVENUE <RNText style={{ color: c.accent }}>OS</RNText>
        </RNText>
        {showTag ? (
          <View style={[styles.tag, { marginTop: Math.max(3, Math.round(nameSize * 0.3)) }]}>
            {Array.from(APP_BRAND_TAGLINE.toUpperCase()).map((ch, i) => (
              <RNText key={i} allowFontScaling={false} style={{ fontFamily: fonts.semibold, fontSize: tagSize, lineHeight: tagSize + 2, color: c.sub }}>
                {ch}
              </RNText>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  tag: { flexDirection: "row", justifyContent: "space-between" },
});
