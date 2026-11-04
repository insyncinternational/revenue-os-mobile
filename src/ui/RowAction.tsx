import { StyleSheet } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import type { Palette } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";

export type RowActionTone = "brand" | "success" | "info" | "warning" | "neutral";

const tones: Record<RowActionTone, { bg: keyof Palette; fg: keyof Palette }> = {
  brand: { bg: "primarySubtle", fg: "primary" },
  success: { bg: "successSurface", fg: "success" },
  info: { bg: "infoSurface", fg: "info" },
  warning: { bg: "warningSurface", fg: "warning" },
  neutral: { bg: "surfaceTertiary", fg: "text" },
};

/**
 * The one quick action on a list row (call, reply, share link, mark done): a small round button on a soft tint, at
 * the row's right edge. It takes its own tap, so the row behind it doesn't open; the touch area is a full 44pt.
 */
export function RowAction({ icon: Icon, label, onPress, tone = "brand" }: { icon: IconComponent; label: string; onPress: () => void; tone?: RowActionTone }) {
  const { colors } = useTheme();
  const t = tones[tone];
  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      scaleTo={0.9}
      style={[styles.button, { backgroundColor: colors[t.bg] }]}
    >
      <Icon size={18} color={colors[t.fg]} strokeWidth={ICON_STROKE + 0.25} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
