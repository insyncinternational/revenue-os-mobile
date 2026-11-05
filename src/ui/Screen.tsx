import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { PullRefresh } from "./PullRefresh";

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

/**
 * Pull-to-refresh offset for a list drawn under the status bar (tab screens with their own header): on Android
 * the spinner then starts below the status bar, not inside the camera cut-out. iOS places it itself.
 */
export function useRefreshOffset(): number | undefined {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? insets.top + space.sm : undefined;
}

/** Every screen's container: theme background, native header insets, keyboard-friendly scrolling. */
export function Screen({ children, refreshing = false, onRefresh, fixed, refreshTint, keyboardAware, contentContainerStyle, ...rest }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Screens with their own top (contentInsetAdjustmentBehavior "never") draw under the status bar.
  const underStatusBar = rest.contentInsetAdjustmentBehavior === "never";
  const spinnerOffset = Platform.OS === "android" && underStatusBar ? insets.top + space.sm : undefined;
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
      refreshControl={onRefresh ? <PullRefresh busy={refreshing} onRefresh={onRefresh} tintColor={refreshTint ?? colors.textMuted} progressViewOffset={spinnerOffset} /> : undefined}
      {...rest}
    >
      {children}
    </Scroll>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // One normal gap after the last card: the tab bar sits below the content, never over it.
  content: { paddingBottom: space.xl },
});
