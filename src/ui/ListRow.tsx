import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { ChevronRight, ICON_STROKE } from "./icons";
import { Text } from "./Text";
import { t } from "@/i18n";

type Props = {
  title: string;
  subtitle?: string | null;
  /** Small text top-right (time, amount). */
  meta?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Bold title + dot: unread item. */
  unread?: boolean;
  chevron?: boolean;
  subtitleLines?: 1 | 2;
  /** Two lines for long titles that must be read whole (activity sentences); lists that recycle keep one. */
  titleLines?: 1 | 2;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
};

/** The one list row used by every list (inbox, contacts, deals, tasks, notifications). Fixed structure = smooth recycling. */
export const ListRow = memo(function ListRow({ title, subtitle, meta, leading, trailing, unread, chevron, subtitleLines = 1, titleLines = 1, onPress, onLongPress, accessibilityHint }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[unread ? t("state.unread") : null, title, subtitle, meta].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.pressed : colors.surface }]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text variant="headline" weight={unread ? "semibold" : "medium"} numberOfLines={titleLines} style={styles.title}>
            {title}
          </Text>
          {meta ? (
            <Text variant="footnote" tone={unread ? "primary" : "muted"} weight={unread ? "semibold" : "regular"} numeric numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <View style={styles.subLine}>
            <Text variant="subhead" tone={unread ? "secondary" : "muted"} numberOfLines={subtitleLines} style={styles.subtitle}>
              {subtitle}
            </Text>
            {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
          </View>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: gutter, paddingVertical: space.md, gap: space.md, minHeight: 64 },
  leading: { alignSelf: "center" },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleLine: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  title: { flex: 1 },
  subLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
  subtitle: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  trailing: { marginLeft: space.xs },
});
