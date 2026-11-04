import { memo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { Contact } from "@/types/contact";
import { Avatar } from "@/ui/Avatar";
import { Mail, Phone } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { ScoreBar } from "@/ui/Meters";
import { RowAction } from "@/ui/RowAction";
import { Text } from "@/ui/Text";
import { dial } from "./callFollowUp";
import { dialable, fullName, headline } from "./contact";

type Props = { contact: Contact; locale: string; onPress: (c: Contact) => void; onCall?: (c: Contact) => void };

/** A contact: who, what they do, when you last touched them — and one quick way to reach them (call, else email). */
export const ContactRow = memo(function ContactRow({ contact, locale, onPress, onCall }: Props) {
  const { colors } = useTheme();
  const name = fullName(contact);
  const sub = headline(contact) || contact.email || contact.phone || "";
  const phone = dialable(contact.phone);
  const when = contact.last_activity_at ? relativeTime(contact.last_activity_at, locale) : null;
  return (
    <View style={[styles.row, { backgroundColor: colors.background }]}>
      <PressableScale onPress={() => onPress(contact)} accessibilityLabel={[name, sub, when ? t("contacts.lastActivity", { when }) : null].filter(Boolean).join(". ")} scaleTo={0.985} style={styles.main}>
        <Avatar name={name} size={46} />
        <View style={styles.body}>
          {/* Always two lines (name and when, then what they do), so every row is the same height. */}
          <View style={styles.line}>
            <Text variant="headline" numberOfLines={1} style={styles.flex}>
              {name}
            </Text>
            {when ? (
              <Text variant="caption" tone="subtle" numeric numberOfLines={1}>
                {when}
              </Text>
            ) : null}
          </View>
          <Text variant="subhead" tone="muted" numberOfLines={1}>
            {sub || " "}
          </Text>
          {/* The lead score, when the workspace scores leads: warm or cold at a glance. */}
          {contact.score != null ? (
            <View style={styles.score}>
              <ScoreBar value={contact.score} label={t("contacts.score")} />
            </View>
          ) : null}
        </View>
      </PressableScale>
      {/* One quick action in a slot every row keeps, so names and times line up down the list. */}
      {phone ? (
        <RowAction
          icon={Phone}
          label={`${t("contacts.call")} ${name}`}
          tone="success"
          onPress={() => {
            onCall?.(contact);
            dial(phone, contact.id, name);
          }}
        />
      ) : contact.email ? (
        <RowAction icon={Mail} label={`${t("contacts.email")} ${name}`} tone="info" onPress={() => void Linking.openURL(`mailto:${contact.email}`)} />
      ) : (
        <View style={styles.actionSlot} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: gutter, paddingVertical: space.md, gap: space.sm },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.md },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  // Same width as RowAction.
  actionSlot: { width: 40 },
  score: { marginTop: 4, maxWidth: 180 },
});
