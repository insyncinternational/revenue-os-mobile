import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

type Props = Omit<ScrollViewProps, "refreshControl"> & {
  children: ReactNode;
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Static screen (no scroll), e.g. full-screen states. */
  fixed?: boolean;
};

/** Every screen's container: theme background, native header insets, keyboard-friendly scrolling. */
export function Screen({ children, refreshing = false, onRefresh, fixed, contentContainerStyle, ...rest }: Props) {
  const { colors } = useTheme();
  if (fixed) return <View style={[styles.fill, { backgroundColor: colors.background }]}>{children}</View>;
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} colors={[colors.primary]} progressBackgroundColor={colors.surface} /> : undefined}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: space.huge * 2 },
});
