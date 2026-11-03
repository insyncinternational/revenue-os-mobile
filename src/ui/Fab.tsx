import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, shadows } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, Plus, type IconComponent } from "./icons";

/**
 * The floating "+" button, bottom-right. Tab screens already end above the tab bar; a screen pushed above the
 * tabs (`inStack`) reaches the bottom edge, so it keeps clear of the home indicator.
 */
export function Fab({ label, onPress, icon: Icon = Plus, bottomOffset = 16, inStack }: { label: string; onPress: () => void; icon?: IconComponent; bottomOffset?: number; inStack?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = bottomOffset + (inStack ? insets.bottom : 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.fab,
        { right: gutter, bottom, backgroundColor: pressed ? colors.inkPressed : colors.ink, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Icon size={26} color={colors.onInk} strokeWidth={ICON_STROKE + 0.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: shadows.neutral, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
