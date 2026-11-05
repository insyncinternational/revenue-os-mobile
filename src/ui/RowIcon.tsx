import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { ICON_STROKE, type IconComponent } from "./icons";

/** Width of a row's leading icon, for dividers inset past it. */
export const ROW_ICON = 36;

/** A list row's leading icon: one calm grey circle with the icon in text colour, the same in every list. */
export function RowIcon({ icon: Icon }: { icon: IconComponent }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.circle, { backgroundColor: colors.surfaceSecondary }]}>
      <Icon size={18} color={colors.text} strokeWidth={ICON_STROKE} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: ROW_ICON, height: ROW_ICON, borderRadius: ROW_ICON / 2, alignItems: "center", justifyContent: "center" },
});
