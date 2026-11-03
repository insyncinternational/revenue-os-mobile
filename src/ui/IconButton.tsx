import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, touchTarget } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";

type Props = Omit<PressableProps, "children" | "style"> & {
  icon: IconComponent;
  /** Required: icon-only buttons need a spoken label. */
  label: string;
  tone?: "default" | "primary" | "danger";
  filled?: boolean;
  /** A floating white circle (headers: back, edit, more), the same in every screen. */
  circle?: boolean;
  size?: number;
};

/** Icon-only button with a full 44pt touch area, whatever the icon size. */
export function IconButton({ icon: Icon, label, tone = "default", filled, circle, size = 22, disabled, ...rest }: Props) {
  const { colors } = useTheme();
  const fg = tone === "primary" ? colors.primary : tone === "danger" ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? colors.pressed : circle ? colors.surface : filled ? colors.surfaceSecondary : "transparent" },
        circle && { boxShadow: colors.cardShadowSoft },
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <Icon size={size} color={fg} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
});
