import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { ICON_STROKE, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** A lucide icon (brand colour), or `glyph` for a company mark such as WhatsApp's. */
  icon?: IconComponent;
  glyph?: ReactNode;
};

/** One of the big round actions under a contact's name (Call, Text, Email, WhatsApp). Dimmed when unavailable. */
export function ActionCircle({ icon: Icon, glyph, label, onPress, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} scaleTo={0.92} style={[styles.wrap, disabled && styles.off]}>
      <View style={[styles.circle, { backgroundColor: colors.surface, borderColor: "transparent" }]}>
        {glyph ?? (Icon ? <Icon size={22} color={disabled ? colors.textSubtle : colors.primary} strokeWidth={ICON_STROKE + 0.25} /> : null)}
      </View>
      <Text variant="caption" tone={disabled ? "subtle" : "secondary"} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.xs + 2, minWidth: 64 },
  circle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  off: { opacity: 0.55 },
});
