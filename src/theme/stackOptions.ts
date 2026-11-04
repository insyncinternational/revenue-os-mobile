import { createElement, useMemo, type ComponentProps } from "react";
import { useReducedMotion } from "react-native-reanimated";
import type { Stack } from "expo-router";
import { useTheme } from "./ThemeProvider";
import { HeaderBack } from "@/ui/HeaderBack";
import { fonts } from "./tokens";

type ScreenOptions = ComponentProps<typeof Stack>["screenOptions"];
export type StackOptions = Exclude<ScreenOptions, ((...args: never[]) => unknown) | undefined>;

/**
 * Header look for every stack: flat, theme background, a round back button, Geist titles. Screens push in
 * from the side (sheets keep their own slide up); none with Reduce Motion.
 */
export function useStackOptions(): StackOptions {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  return useMemo<StackOptions>(
    () => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.primary,
      headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
      headerLargeTitleStyle: { fontFamily: fonts.bold, color: colors.text },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      headerBackVisible: false,
      headerLeft: ({ canGoBack }) => (canGoBack ? createElement(HeaderBack) : undefined),
      contentStyle: { backgroundColor: colors.background },
      animation: reduce ? "none" : "slide_from_right",
    }),
    [colors, reduce]
  );
}
