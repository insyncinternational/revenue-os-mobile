import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, touchTarget, type Palette } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "./icons";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconComponent;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const heights: Record<ButtonSize, number> = { sm: 36, md: touchTarget, lg: 52 };

function colorsFor(variant: ButtonVariant, c: Palette, pressed: boolean) {
  switch (variant) {
    case "primary":
      return { bg: pressed ? c.primaryFillPressed : c.primaryFill, fg: c.onPrimary, border: "transparent" };
    case "secondary":
      return { bg: pressed ? c.pressed : c.surface, fg: c.text, border: c.borderStrong };
    case "ghost":
      return { bg: pressed ? c.primarySubtlePressed : "transparent", fg: c.primary, border: "transparent" };
    case "danger":
      return { bg: pressed ? c.dangerSurface : "transparent", fg: c.danger, border: c.danger };
  }
}

export function Button({ label, variant = "primary", size = "md", icon: Icon, loading, fullWidth, disabled, style, ...rest }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      hitSlop={size === "sm" ? 6 : undefined}
      style={({ pressed }) => {
        const v = colorsFor(variant, colors, pressed);
        return [
          styles.base,
          { height: heights[size], paddingHorizontal: size === "sm" ? space.md : space.lg, backgroundColor: v.bg, borderColor: v.border },
          fullWidth && styles.full,
          inactive && styles.disabled,
          style,
        ];
      }}
      {...rest}
    >
      {({ pressed }) => {
        const fg = colorsFor(variant, colors, pressed).fg;
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="small" color={fg} />
            ) : (
              Icon && <Icon size={size === "sm" ? 16 : 18} color={fg} strokeWidth={ICON_STROKE + 0.25} />
            )}
            <Text variant="callout" weight="semibold" style={{ color: fg }} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  full: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: space.sm },
  disabled: { opacity: 0.45 },
});
