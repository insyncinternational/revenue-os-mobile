import { useMemo, type ComponentProps } from "react";
import type { Stack } from "expo-router";
import { useTheme } from "./ThemeProvider";
import { fonts } from "./tokens";

type ScreenOptions = ComponentProps<typeof Stack>["screenOptions"];
export type StackOptions = Exclude<ScreenOptions, ((...args: never[]) => unknown) | undefined>;

/** Header look for every stack: flat, theme background, brand-coloured back button, Inter titles. */
export function useStackOptions(): StackOptions {
  const { colors } = useTheme();
  return useMemo<StackOptions>(
    () => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.primary,
      headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
      headerLargeTitleStyle: { fontFamily: fonts.bold, color: colors.text },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors]
  );
}
