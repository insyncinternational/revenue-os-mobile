import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

/** `dot`: the solid colour of the status, for the small dot in front of the label. */
const tones: Record<BadgeTone, { bg: keyof Palette; fg: keyof Palette; dot: keyof Palette }> = {
  neutral: { bg: "surfaceTertiary", fg: "textSecondary", dot: "textMuted" },
  brand: { bg: "primarySubtle", fg: "primaryText", dot: "primary" },
  success: { bg: "successSurface", fg: "successText", dot: "success" },
  warning: { bg: "warningSurface", fg: "warningText", dot: "warning" },
  danger: { bg: "dangerSurface", fg: "dangerText", dot: "danger" },
  info: { bg: "infoSurface", fg: "infoText", dot: "info" },
};

/**
 * A soft status chip: tinted background, dark text in the same colour. `dot` puts a small solid dot in front, for
 * live states ("Live", "Overdue") that should read before the word does.
 */
export function Badge({ label, tone = "neutral", dot }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const { colors } = useTheme();
  const t = tones[tone];
  return (
    <View style={[styles.badge, dot && styles.withDot, { backgroundColor: colors[t.bg] }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: colors[t.dot] }]} /> : null}
      <Text variant="caption" style={{ color: colors[t.fg] }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Small solid counter (unread counts). Hidden at 0. */
export function CountBadge({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[styles.count, { backgroundColor: colors.primaryFill }]} accessibilityLabel={`${count} unread`}>
      <Text variant="caption" numeric weight="semibold" style={{ color: colors.onPrimary, fontSize: 11, lineHeight: 14 }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radius.pill },
  withDot: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
