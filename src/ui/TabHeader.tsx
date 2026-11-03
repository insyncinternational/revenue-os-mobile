import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { HeroTopBar } from "./HeroTopBar";
import { Text } from "./Text";

/**
 * The header of every main tab, in the same family as Today's: on the page background (no colour band), the
 * workspace / bell / person bar, a bold title and one line saying where things stand. Replaces the plain system
 * title, so moving between tabs feels like one app. The brand colour is kept for accents (an agency's, if set).
 */
export function TabHeader({
  title,
  summary,
  leading,
  titleAccessory,
  hideProfile,
  children,
}: {
  title: string;
  summary?: string | null;
  leading?: ReactNode;
  /** Right after the title (e.g. the More tab's pen to edit the profile); the title shortens first. */
  titleAccessory?: ReactNode;
  /** Leave the person out of the top bar (the Account tab shows them as its title). */
  hideProfile?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + space.md }]}>
      <HeroTopBar hideProfile={hideProfile} />
      <View style={styles.titleRow}>
        {leading}
        <View style={styles.titles}>
          <View style={styles.titleLine}>
            <Text variant="largeTitle" style={[styles.title, { color: colors.text }]} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {titleAccessory}
          </View>
          {summary ? (
            <Text variant="subhead" style={{ color: colors.textMuted }} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: gutter,
    paddingBottom: space.lg,
    gap: space.lg,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: space.sm, minWidth: 0 },
  title: { flexShrink: 1 },
});
