import { useTheme } from "@/theme/ThemeProvider";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, Plus, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";

/**
 * A screen's main "add" action as an ink round button in its header (main tabs: end of the title row; pushed
 * screens: `headerRight`). Replaces the floating "+" — nothing floats over content in the Mono look.
 * `size` 48 on tab headers, 40 in a native top bar.
 */
export function HeaderAction({ label, onPress, icon: Icon = Plus, size = 48 }: { label: string; onPress: () => void; icon?: IconComponent; size?: number }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      scaleTo={0.92}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}
    >
      <Icon size={size >= 48 ? 22 : 19} color={colors.onInk} strokeWidth={ICON_STROKE + 0.5} />
    </PressableScale>
  );
}
