import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { Text } from "./Text";

/** A labelled group in a form (chips, pickers) — same label style as Input. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="footnote" weight="medium" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ field: { gap: space.sm } });
