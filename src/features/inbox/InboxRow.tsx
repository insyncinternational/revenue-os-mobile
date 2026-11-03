import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { InboxItem } from "@/types/inbox";
import { Avatar } from "@/ui/Avatar";
import { CountBadge } from "@/ui/Badge";
import { ChannelBadge } from "@/ui/ChannelIcon";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { contactName, splitPreview } from "./list";

type Props = { item: InboxItem; locale: string; onPress: (item: InboxItem) => void; onLongPress?: (item: InboxItem) => void };

/** One conversation: who, which channel, the last line, when, and whether it's waiting on you. */
export const InboxRow = memo(function InboxRow({ item, locale, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const name = contactName(item);
  const unread = item.unread_count > 0;
  const preview = splitPreview(item.preview, item);
  const subject = item.channel === "email" && item.subject ? item.subject : null;
  return (
    <PressableScale
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      delayLongPress={350}
      scaleTo={0.985}
      accessibilityLabel={[unread ? t("state.unread") : null, name, subject, preview.text].filter(Boolean).join(". ")}
      style={[styles.row, { backgroundColor: colors.background }]}
    >
      <View>
        <Avatar name={name} size={48} />
        <View style={styles.channel}>
          <ChannelBadge channel={item.channel} size={20} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="headline" weight={unread ? "bold" : "medium"} numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="footnote" numeric tone={unread ? "primary" : "subtle"} weight={unread ? "semibold" : "regular"}>
            {item.last_message_at ? relativeTime(item.last_message_at, locale) : ""}
          </Text>
        </View>
        {subject ? (
          <Text variant="subhead" weight={unread ? "semibold" : "regular"} tone={unread ? "default" : "secondary"} numberOfLines={1}>
            {subject}
          </Text>
        ) : null}
        <View style={styles.line}>
          <Text variant="subhead" tone={unread ? "secondary" : "muted"} numberOfLines={subject ? 1 : 2} style={styles.flex}>
            {preview.mine ? <Text variant="subhead" tone="subtle">{`${t("inbox.you")}: `}</Text> : null}
            {preview.text}
          </Text>
          {unread ? <CountBadge count={item.unread_count} /> : null}
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, paddingHorizontal: gutter, paddingVertical: space.md, alignItems: "flex-start" },
  channel: { position: "absolute", right: -3, bottom: -3 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
});
