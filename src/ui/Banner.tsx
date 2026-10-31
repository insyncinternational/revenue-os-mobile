import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { CheckCircle2, CircleAlert, ICON_STROKE } from "./icons";
import { Text } from "./Text";

type Tone = "danger" | "warning" | "success" | "info";

const tone: Record<Tone, { bg: keyof Palette; fg: keyof Palette; icon: keyof Palette }> = {
  danger: { bg: "dangerSurface", fg: "dangerText", icon: "danger" },
  warning: { bg: "warningSurface", fg: "warningText", icon: "warning" },
  success: { bg: "successSurface", fg: "successText", icon: "success" },
  info: { bg: "infoSurface", fg: "infoText", icon: "info" },
};

/** Inline message inside a screen (form errors, notices). Announced to screen readers. */
export function Banner({ message, kind = "danger" }: { message: string; kind?: Tone }) {
  const { colors } = useTheme();
  const t = tone[kind];
  const Icon = kind === "success" ? CheckCircle2 : CircleAlert;
  return (
    <View style={[styles.banner, { backgroundColor: colors[t.bg] }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon size={18} color={colors[t.icon]} strokeWidth={ICON_STROKE + 0.25} />
      <Text variant="subhead" style={[styles.text, { color: colors[t.fg] }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, padding: space.md, borderRadius: radius.md },
  text: { flex: 1 },
});
