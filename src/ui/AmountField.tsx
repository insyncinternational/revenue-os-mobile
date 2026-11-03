import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { maxFontScale, radius, space, typography } from "@/theme/tokens";
import { Text } from "./Text";

/** Money typed large, the currency beside it: the number a deal or invoice is about reads first. */
export function AmountField({ label, currency, value, onChangeText, error }: { label: string; currency: string; value: string; onChangeText: (v: string) => void; error?: string | null }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="footnote" weight="medium" tone="secondary">
        {label}
      </Text>
      <View style={[styles.field, { backgroundColor: focused ? colors.surface : colors.surfaceSecondary, borderColor: error ? colors.danger : focused ? colors.borderFocus : "transparent" }]}>
        <Text variant="headline" tone="muted">
          {currency}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxFontSizeMultiplier={maxFontScale.dense}
          accessibilityLabel={`${label} (${currency})`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  field: { flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: space.lg, minHeight: 64 },
  input: { flex: 1, fontFamily: typography.display.fontFamily, fontSize: 30, letterSpacing: -0.8, paddingVertical: space.sm, outlineWidth: 0 },
});
