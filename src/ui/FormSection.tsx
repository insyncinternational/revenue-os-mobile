import { createContext, type ReactNode } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Card } from "./Card";
import { ICON_STROKE, type IconComponent } from "./icons";
import { Text } from "./Text";

/** Inputs inside a FormSection draw filled (soft grey, no outline until focused) instead of outlined. */
export const FilledInputs = createContext(false);

/**
 * One group of a form on its own card: a small brand icon and title, then its fields. Forms read as a few calm
 * blocks ("Deal", "Contact", "When") instead of one long stack of boxes.
 */
export function FormSection({ title, icon: Icon, children }: { title: string; icon?: IconComponent; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card contentStyle={styles.body}>
      <View style={styles.head}>
        {Icon ? (
          <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
            <Icon size={15} color={colors.primary} strokeWidth={ICON_STROKE + 0.25} />
          </View>
        ) : null}
        <Text variant="callout" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
      </View>
      <FilledInputs.Provider value>{children}</FilledInputs.Provider>
    </Card>
  );
}

/** A yes/no setting as a row with a switch (and an optional line explaining it). */
export function ToggleRow({ label, hint, value, onValueChange }: { label: string; hint?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Text variant="subhead" weight="medium">
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} trackColor={{ true: colors.primaryFill, false: colors.borderStrong }} ios_backgroundColor={colors.borderStrong} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: { width: 28, height: 28, borderRadius: radius.md - 2, alignItems: "center", justifyContent: "center" },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
