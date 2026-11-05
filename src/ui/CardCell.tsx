import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Divider } from "./Section";

/**
 * One row of a long (recycled) list drawn as a single white card, like every short list in a Card: rounded at
 * the first and last row, a hairline between rows starting at `inset`. Lets FlashList lists match Card lists.
 */
export function CardCell({ first, last, inset, children }: { first: boolean; last: boolean; inset: number; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cell, { backgroundColor: colors.surface }, first && styles.first, last && styles.last]}>
      {first ? null : <Divider inset={inset} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { marginHorizontal: gutter, overflow: "hidden" },
  first: { borderTopLeftRadius: radius.xl + 4, borderTopRightRadius: radius.xl + 4, paddingTop: space.xs },
  last: { borderBottomLeftRadius: radius.xl + 4, borderBottomRightRadius: radius.xl + 4, paddingBottom: space.xs },
});
