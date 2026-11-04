import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

type Props = ViewProps & {
  padded?: boolean;
  /** Lifted card: soft shadow in light mode, a raised surface in dark mode (for primary content). */
  elevated?: boolean;
  onPress?: () => void;
  /** The card box (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout of the content inside (gap, direction, alignment). */
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A flat, borderless card: white on the light grey page, a stepped-up surface on the dark one — no outlines in either
 * theme. `elevated` lifts primary content a little further (a soft shadow in light, a brighter surface in dark).
 * Rule: a card with `onPress` must not contain buttons (a button inside a button breaks screen readers). Cards
 * with their own actions stay static and put the tap target on a row or the actions themselves.
 */
export function Card({ padded = true, elevated, onPress, style, contentStyle, children, accessibilityLabel, ...rest }: Props) {
  const { colors, scheme } = useTheme();
  const dark = scheme === "dark";
  const look = dark
    ? { backgroundColor: elevated ? colors.surfaceRaised : colors.surface, borderColor: "transparent" }
    : { backgroundColor: colors.surface, borderColor: "rgba(255, 255, 255, 0.9)", boxShadow: colors.cardShadowSoft };
  const base = [styles.card, look, style];
  // The shadow needs the outer view unclipped; the inner one clips rows (and their pressed state) to the corners.
  const inner = <View style={[styles.clip, padded && styles.padded, contentStyle]}>{children}</View>;
  if (!onPress) {
    return (
      <View style={base} {...rest}>
        {inner}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={base} scaleTo={0.985} {...rest}>
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1 },
  clip: { borderRadius: radius.xl - 1, overflow: "hidden" },
  padded: { padding: space.lg },
});
