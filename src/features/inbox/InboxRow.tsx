import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import type { InboxItem } from "@/types/inbox";
import { Avatar } from "@/ui/Avatar";
import { CountBadge } from "@/ui/Badge";
import { ChannelBadge } from "@/ui/ChannelIcon";
import { Reply } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { RowAction } from "@/ui/RowAction";
import { Text } from "@/ui/Text";
import { contactName, splitPreview } from "./list";

type Props = {
  item: InboxItem;
  locale: string;
  onPress: (item: InboxItem) => void;
  onLongPress?: (item: InboxItem) => void;
  /** Reply straight away (opens the thread with the box focused); shown on unread rows you can answer. */
  onReply?: (item: InboxItem) => void;
};

/** One conversation: who, which channel, the last line, when, and whether it's waiting on you. */
export const InboxRow = memo(function InboxRow({ item, locale, onPress, onLongPress, onReply }: Props) {
  const { colors } = useTheme();
  const name = contactName(item);
  const unread = item.unread_count > 0;
  const preview = splitPreview(item.preview, item);
  const subject = item.channel === "email" && item.subject ? item.subject : null;
  const replyHere = unread && item.can_reply && onReply != null;
  return (
    <PressableScale
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      delayLongPress={350}
      scaleTo={0.985}
      accessibilityLabel={[unread ? t("state.unread") : null, name, subject, preview.text].filter(Boolean).join(". ")}
      style={[styles.row, { backgroundColor: colors.surface }]}
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
          {/* The Reply button already says "waiting on you"; the count shows when there's no button. */}
          {unread && !replyHere ? <CountBadge count={item.unread_count} /> : null}
        </View>
      </View>
      {replyHere ? (
        <View style={styles.action}>
          <RowAction icon={Reply} label={`${t("inbox.reply")} ${name}`} onPress={() => onReply(item)} />
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, paddingHorizontal: space.md + 2, paddingVertical: space.md + 2, alignItems: "flex-start" },
  channel: { position: "absolute", right: -3, bottom: -3 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  action: { alignSelf: "center" },
});
