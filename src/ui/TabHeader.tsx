import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space, type Area } from "@/theme/tokens";
import { Backdrop } from "./Backdrop";
import { HeaderAction } from "./HeaderAction";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/**
 * The header of every main tab except Today: on the page, a bold title (or one quiet line) and one line saying
 * where things stand, with round buttons on the right. Replaces the plain system
 * title, so moving between tabs feels like one app. The brand colour is kept for accents (an agency's, if set).
 */
export function TabHeader({
  title,
  summary,
  leading,
  titleAccessory,
  area,
  quiet,
  action,
  extra,
  children,
}: {
  title: string;
  summary?: string | null;
  leading?: ReactNode;
  /** Right after the title (e.g. the More tab's pen to edit the profile); the title shortens first. */
  titleAccessory?: ReactNode;
  /** Kept for callers; the person and workspace now live on Today's header only. */
  hideProfile?: boolean;
  /** One small line ("Pipeline · 2 open deals") instead of the big title, for a screen led by a big number. */
  quiet?: boolean;
  /** The area colour washed (light) or glowing (dark) behind the header. */
  area?: Area;
  /** The screen's main "add" action: an ink round button at the end of the title row (replaces the floating +). */
  action?: { label: string; onPress: () => void; icon?: IconComponent };
  /** A smaller white round button before the action (e.g. search). */
  extra?: { label: string; onPress: () => void; icon: IconComponent; active?: boolean };
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + space.md }]}>
      {area ? <Backdrop area={area} /> : null}
      <View style={styles.titleRow}>
        {leading}
        <View style={styles.titles}>
          {quiet ? (
            <Text variant="callout" weight="regular" style={{ color: colors.textMuted }} accessibilityRole="header" numberOfLines={1}>
              {summary ? `${title} · ${summary}` : title}
            </Text>
          ) : (
            <View style={styles.titleLine}>
              <Text variant="largeTitle" style={[styles.title, { color: colors.text }]} accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
              {titleAccessory}
            </View>
          )}
          {summary && !quiet ? (
            <Text variant="subhead" style={{ color: colors.textMuted }} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        {extra ? (
          <PressableScale onPress={extra.onPress} accessibilityRole="button" accessibilityLabel={extra.label} accessibilityState={{ selected: !!extra.active }} scaleTo={0.92} style={[styles.extra, { backgroundColor: extra.active ? colors.ink : colors.surface }]}>
            <extra.icon size={19} color={extra.active ? colors.onInk : colors.text} strokeWidth={ICON_STROKE} />
          </PressableScale>
        ) : null}
        {action ? <HeaderAction {...action} /> : null}
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
  extra: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
