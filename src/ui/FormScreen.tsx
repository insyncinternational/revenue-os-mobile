import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";

/**
 * Full-screen form (sign-in, codes, gates): content centred on tall phones, scrolls on short ones, and the
 * focused field and the main button stay above the keyboard. Width capped so it reads well on tablets too.
 */
export function FormScreen({ children, footer, topInset = true }: { children: ReactNode; footer?: ReactNode; topInset?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: (topInset ? insets.top : 0) + space.xxl, paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>{children}</View>
        {footer ? <View style={[styles.column, styles.footer]}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: gutter + space.xs, justifyContent: "space-between" },
  column: { width: "100%", maxWidth: 440, alignSelf: "center", gap: space.lg },
  footer: { marginTop: space.xxl },
});
