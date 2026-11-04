import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, maxFontScale, radius, space } from "@/theme/tokens";
import { ICON_STROKE, Search, X } from "./icons";

type Props = Omit<TextInputProps, "onChange"> & { value: string; onChangeText: (v: string) => void };

export function SearchBar({ value, onChangeText, placeholder = "Search", ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      <Search size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        maxFontSizeMultiplier={maxFontScale.dense}
        accessibilityRole="search"
        style={[styles.input, { color: colors.text }]}
        {...rest}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
          <X size={16} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 46, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, gap: space.sm },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 0, outlineWidth: 0 },
});
