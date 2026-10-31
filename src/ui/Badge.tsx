import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, { bg: keyof Palette; fg: keyof Palette }> = {
  neutral: { bg: "surfaceTertiary", fg: "textSecondary" },
  brand: { bg: "primarySubtle", fg: "primaryText" },
  success: { bg: "successSurface", fg: "successText" },
  warning: { bg: "warningSurface", fg: "warningText" },
  danger: { bg: "dangerSurface", fg: "dangerText" },
  info: { bg: "infoSurface", fg: "infoText" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[t.bg] }]}>
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
  badge: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
