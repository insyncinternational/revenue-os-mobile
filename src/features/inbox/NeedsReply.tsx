import { ScrollView, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { InboxItem } from "@/types/inbox";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { ChannelBadge } from "@/ui/ChannelIcon";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { contactName, waitingOnYou } from "./list";

/**
 * The people waiting on a reply, as a labelled row of avatars with a brand ring (like stories): one tap opens the
 * conversation. Nothing when no one is waiting.
 */
export function NeedsReply({ items, onOpen }: { items: InboxItem[]; onOpen: (item: InboxItem) => void }) {
  const { colors } = useTheme();
  const waiting = waitingOnYou(items);
  if (waiting.length === 0) return null;
  return (
    <View style={styles.block}>
      <View style={styles.label} accessibilityRole="header">
        <Text variant="subhead" weight="semibold">
          {t("inbox.needsReply")}
        </Text>
        <Badge label={String(waiting.length)} tone="brand" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {waiting.map((item) => {
          const name = contactName(item);
          const first = name.split(/\s+/)[0] ?? name;
          return (
            <PressableScale key={item.id} onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={name} scaleTo={0.94} style={styles.person}>
              <View style={[styles.ring, { borderColor: colors.primary }]}>
                <Avatar name={name} size={54} />
                <View style={styles.badge}>
                  <ChannelBadge channel={item.channel} size={20} />
                </View>
              </View>
              <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.name}>
                {first}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingTop: space.xs },
  label: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: gutter },
  row: { paddingHorizontal: gutter, gap: space.md },
  person: { alignItems: "center", gap: space.xs + 2, width: 66 },
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -2, bottom: -2 },
  name: { maxWidth: 66, textAlign: "center" },
});
