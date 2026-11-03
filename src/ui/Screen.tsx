import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

type Props = Omit<ScrollViewProps, "refreshControl"> & {
  children: ReactNode;
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Static screen (no scroll), e.g. full-screen states. */
  fixed?: boolean;
  /** Pull-to-refresh spinner colour when it sits on something other than the background (e.g. a hero). */
  refreshTint?: string;
  /** The screen has fields: the focused one scrolls above the keyboard (both platforms). */
  keyboardAware?: boolean;
};

/** Every screen's container: theme background, native header insets, keyboard-friendly scrolling. */
export function Screen({ children, refreshing = false, onRefresh, fixed, refreshTint, keyboardAware, contentContainerStyle, ...rest }: Props) {
  const { colors } = useTheme();
  if (fixed) return <View style={[styles.fill, { backgroundColor: colors.background }]}>{children}</View>;
  const Scroll = keyboardAware ? KeyboardAwareScrollView : ScrollView;
  return (
    <Scroll
      bottomOffset={keyboardAware ? 24 : undefined}
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={refreshTint ?? colors.textMuted} colors={[colors.primary]} progressBackgroundColor={colors.surface} /> : undefined}
      {...rest}
    >
      {children}
    </Scroll>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: space.huge * 2 },
});
