import { use, useState, type ReactNode, type Ref } from "react";
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, maxFontScale, radius, space, touchTarget, typography } from "@/theme/tokens";
import { FilledInputs } from "./FormSection";
import { ICON_STROKE, type IconComponent } from "./icons";
import { Text } from "./Text";

type Props = TextInputProps & {
  ref?: Ref<TextInputInstance>;
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconComponent;
  /** A control at the end of the field (e.g. show/hide password). */
  trailing?: ReactNode;
};

export function Input({ ref, label, hint, error, icon: Icon, trailing, style, onFocus, onBlur, editable = true, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // Inside a form section: filled soft grey, outlined only while focused. Elsewhere (sign-in): outlined.
  const filled = use(FilledInputs);
  const borderColor = error ? colors.danger : focused ? colors.borderFocus : filled ? "transparent" : colors.border;
  const background = filled && !focused ? colors.surfaceSecondary : colors.surface;
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="footnote" weight="medium" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, { backgroundColor: background, borderColor, borderWidth: filled || focused || error ? 1.5 : 1 }, !editable && { backgroundColor: colors.surfaceSecondary }]}>
        {Icon ? <Icon size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} /> : null}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxFontSizeMultiplier={maxFontScale.dense}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  field: { minHeight: touchTarget + 4, borderRadius: radius.md, flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, gap: space.sm },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: typography.body.fontSize, paddingVertical: space.sm + 2, outlineWidth: 0 },
});
