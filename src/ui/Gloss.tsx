import { StyleSheet, View } from "react-native";
import type { Palette } from "@/theme/tokens";

/**
 * The glossy accent fill: a diagonal gradient from a light tint of the brand colour through the colour itself to a
 * deep shade (all three follow an agency's colour). Use as `backgroundImage` next to `backgroundColor: primaryFill`
 * (the plain colour shows if gradients aren't drawn).
 */
export function accentGradient(c: Palette): string {
  return `linear-gradient(145deg, ${c.heroGlow} 0%, ${c.primaryFill} 48%, ${c.heroFrom} 100%)`;
}

/**
 * The shine on a glossy surface: a soft white sheen over the top half and a faint light rim along the top edge.
 * Put it first inside a card with `overflow: "hidden"`; it never takes taps.
 */
export function Sheen({ strength = 1 }: { strength?: number }) {
  const a = 0.22 * strength;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, ${a}) 0%, rgba(255, 255, 255, ${a * 0.25}) 38%, rgba(255, 255, 255, 0) 60%)`,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          borderColor: `rgba(255, 255, 255, ${0.35 * strength})`,
          borderRadius: 999,
        },
        styles.noRadius,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // The parent clips to its own corners; the sheen itself stays square so it fills them.
  noRadius: { borderRadius: 0 },
});
