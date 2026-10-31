import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { t } from "@/i18n";
import { useWorkspaceAccess } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { ChevronDown, ICON_STROKE } from "./icons";
import { Text } from "./Text";

/** "Northwind ▾" — which workspace (or agency client) the screens show; tap to switch. */
export function WorkspacePill() {
  const { colors } = useTheme();
  const access = useWorkspaceAccess().data;
  const name = access?.client?.name ?? access?.workspace.name ?? "…";
  return (
    <Pressable
      onPress={() => router.push("/switcher")}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${t("workspace.title")}`}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.primarySubtlePressed : colors.primarySubtle }]}
    >
      <Text variant="subhead" weight="semibold" tone="primary" numberOfLines={1} style={styles.name}>
        {name}
      </Text>
      <ChevronDown size={16} color={colors.primary} strokeWidth={ICON_STROKE + 0.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "flex-start", height: 32, paddingLeft: space.md, paddingRight: space.sm, borderRadius: radius.pill, maxWidth: 260 },
  name: { flexShrink: 1 },
});
