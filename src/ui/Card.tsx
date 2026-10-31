import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

type Props = ViewProps & { padded?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string };

/**
 * Surface with a hairline border (no heavy shadows — matches the web's flat cards).
 * Rule: a card with `onPress` must not contain buttons (a button inside a button breaks screen readers). Cards
 * with their own actions stay static and put the tap target on a row or the actions themselves.
 */
export function Card({ padded = true, onPress, style, children, accessibilityLabel, ...rest }: Props) {
  const { colors } = useTheme();
  const base = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, padded && styles.padded, style];
  if (!onPress) {
    return (
      <View style={base} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: colors.pressed }]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  padded: { padding: space.lg },
});
