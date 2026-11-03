import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * Full-screen form (sign-in, codes, gates): content centred on tall phones, scrolls on short ones, and the
 * focused field and the main button stay above the keyboard. Width capped so it reads well on tablets too.
 * `sheetTitle`: an Android form sheet has no native header (iOS shows the screen title there), so it is drawn here.
 * `sticky`: the main action pinned under the form (stays in reach above the keyboard, never scrolled away).
 * Keyboard: react-native-keyboard-controller on both platforms. React Native's own KeyboardAvoidingView did
 * nothing on Android with edge-to-edge on, so fields there sat under the keyboard.
 */
/** Room kept between the focused field and the keyboard (more when the pinned action sits on top of it). */
const FIELD_GAP = 24;
const STICKY_GAP = 96;
export function FormScreen({ children, footer, topInset = true, sheetTitle, sticky }: { children: ReactNode; footer?: ReactNode; topInset?: boolean; sheetTitle?: string; sticky?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={sticky ? STICKY_GAP : FIELD_GAP}
        contentContainerStyle={[styles.content, { paddingTop: (topInset ? insets.top : 0) + space.xxl, paddingBottom: sticky ? space.xl : insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          {sheetTitle && Platform.OS === "android" ? (
            <Text variant="title" accessibilityRole="header">
              {sheetTitle}
            </Text>
          ) : null}
          {children}
        </View>
        {footer ? <View style={[styles.column, styles.footer]}>{footer}</View> : null}
      </KeyboardAwareScrollView>
      {sticky ? (
        // Rides on top of the keyboard; the safe-area gap below it isn't needed while the keyboard is up.
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={[styles.sticky, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + space.md }]}>
            <View style={styles.column}>{sticky}</View>
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: gutter + space.xs, justifyContent: "space-between" },
  column: { width: "100%", maxWidth: 440, alignSelf: "center", gap: space.lg },
  footer: { marginTop: space.xxl },
  sticky: { paddingHorizontal: gutter + space.xs, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
