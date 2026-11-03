import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Text } from "./Text";

/** `right`: a small control beside the title (for example a period switch); shown instead of the text action. */
export function SectionHeader({ title, action, onAction, right }: { title: string; action?: string; onAction?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="headline" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right ? (
        right
      ) : action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text variant="subhead" tone="primary" weight="semibold">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Hairline separator, inset to line up with row text when `inset` is the leading width. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: gutter, paddingTop: space.xxl, paddingBottom: space.sm, gap: space.md },
  title: { flex: 1 },
});
