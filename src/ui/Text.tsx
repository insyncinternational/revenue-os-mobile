import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, maxFontScale, typography, type Palette, type TextVariant } from "@/theme/tokens";

export type TextTone = "default" | "secondary" | "muted" | "subtle" | "primary" | "success" | "warning" | "danger" | "inverse" | "onPrimary";

const toneColor: Record<TextTone, keyof Palette> = {
  default: "text",
  secondary: "textSecondary",
  muted: "textMuted",
  subtle: "textSubtle",
  primary: "primary",
  success: "successText",
  warning: "warningText",
  danger: "dangerText",
  inverse: "textInverse",
  onPrimary: "onPrimary",
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof fonts;
  align?: "left" | "center" | "right";
  /** Tabular figures for counts and money, so numbers don't jump as they change. */
  numeric?: boolean;
};

export function Text({ variant = "body", tone = "default", weight, align, numeric, style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const { colors } = useTheme();
  const t = typography[variant];
  const dense = variant === "caption" || variant === "footnote" || variant === "largeTitle";
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (dense ? maxFontScale.dense : maxFontScale.body)}
      style={[
        t,
        { color: colors[toneColor[tone]] },
        weight && { fontFamily: fonts[weight] },
        align && { textAlign: align },
        numeric && { fontVariant: ["tabular-nums"] },
        style,
      ]}
      {...rest}
    />
  );
}
