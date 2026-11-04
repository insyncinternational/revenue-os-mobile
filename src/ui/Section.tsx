import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Badge } from "./Badge";
import { Text } from "./Text";

/**
 * A section's title, with `count` as a small chip beside it (hidden at 0) and "See all" (`action`) on the right.
 * `right`: a small control beside the title (for example a period switch); shown instead of the text action.
 */
export function SectionHeader({ title, count, action, onAction, right }: { title: string; count?: number; action?: string; onAction?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header} accessibilityRole="header">
      <View style={styles.title}>
        <Text variant="title" style={[styles.titleText, styles.titleSize]} numberOfLines={1}>
          {title}
        </Text>
        {/* Wrapped: a badge keeps to the top of a row by itself; this centres it on the title. */}
        {count ? (
          <View>
            <Badge label={String(count)} tone="brand" />
          </View>
        ) : null}
      </View>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: gutter, paddingTop: space.xxl + 4, paddingBottom: space.md, gap: space.md },
  title: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  titleText: { flexShrink: 1 },
  titleSize: { fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
});
