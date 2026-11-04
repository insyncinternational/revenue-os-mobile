import { ScrollView, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { gutter, space } from "@/theme/tokens";
import type { Contact } from "@/types/contact";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { fullName } from "./contact";

/**
 * The people you've been dealing with lately, as a row of large cards above the A–Z list: the usual next tap,
 * without searching. Nothing when fewer than two have any activity (one card isn't a row).
 */
export function RecentContacts({ contacts, locale, onOpen }: { contacts: Contact[]; locale: string; onOpen: (c: Contact) => void }) {
  if (contacts.length < 2) return null;
  return (
    <View style={styles.block}>
      <Text variant="subhead" weight="semibold" style={styles.title} accessibilityRole="header">
        {t("contacts.recent")}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {contacts.map((c) => {
          const name = fullName(c);
          const when = c.last_activity_at ? relativeTime(c.last_activity_at, locale) : null;
          return (
            <Card key={c.id} onPress={() => onOpen(c)} accessibilityLabel={[name, when ? t("contacts.lastActivity", { when }) : null].filter(Boolean).join(". ")} style={styles.card} contentStyle={styles.body}>
              <Avatar name={name} size={52} />
              <Text variant="callout" weight="semibold" align="center" numberOfLines={1}>
                {name}
              </Text>
              {when ? (
                <Text variant="caption" tone="muted" align="center" numeric numberOfLines={1}>
                  {when}
                </Text>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  title: { paddingHorizontal: gutter },
  // Room above and below for the cards' shadow, which a scroll view would cut off.
  row: { paddingHorizontal: gutter, paddingVertical: space.xs, gap: space.sm + 2 },
  card: { width: 124 },
  body: { alignItems: "center", gap: space.xs, paddingVertical: space.lg, paddingHorizontal: space.sm },
});
