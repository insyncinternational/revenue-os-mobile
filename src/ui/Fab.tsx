import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, shadows } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, Plus, type IconComponent } from "./icons";

/**
 * The floating "+" button, bottom-right of a tab screen. Tab screens already end above the tab bar, so no
 * safe-area offset is added here.
 */
export function Fab({ label, onPress, icon: Icon = Plus, bottomOffset = 16 }: { label: string; onPress: () => void; icon?: IconComponent; bottomOffset?: number }) {
  const { colors } = useTheme();
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
        { right: gutter, bottom: bottomOffset, backgroundColor: pressed ? colors.primaryFillPressed : colors.primaryFill, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Icon size={26} color={colors.onPrimary} strokeWidth={ICON_STROKE + 0.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: shadows.brand, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
