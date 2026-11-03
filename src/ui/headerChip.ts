import { useTheme } from "@/theme/ThemeProvider";

/**
 * The look of pills and round buttons in the light tab headers (workspace switcher, bell, pipeline pill, badges):
 * the same as a card — white on the light grey page, a stepped-up surface on the dark one, no outlines.
 * Use with `borderWidth: 1` in the element's own style.
 */
export function useHeaderChip() {
  const { colors, scheme } = useTheme();
  return scheme === "dark"
    ? { backgroundColor: colors.surface, borderColor: "transparent" }
    : { backgroundColor: colors.surface, borderColor: "transparent", boxShadow: colors.cardShadowSoft };
}
