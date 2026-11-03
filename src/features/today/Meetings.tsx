import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { MeetingRow } from "@/types/home";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Video } from "@/ui/icons";
import { openMeeting } from "@/lib/navigate";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/** Today's meetings as a swipeable row of cards: time first (what you scan for), then who, then Join. */
export function Meetings({ meetings }: { meetings: MeetingRow[] }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  // Read once per mount: "soon" is about this visit, and render stays pure.
  const [now] = useState(() => Date.now());
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} decelerationRate="fast" snapToInterval={232 + space.md}>
      {meetings.map((m) => {
        const at = m.due_at ? Date.parse(m.due_at) : NaN;
        const soon = Number.isFinite(at) && at - now < 30 * 60_000 && at - now > -60 * 60_000;
        return (
          <Card key={m.task_id} elevated style={styles.card}>
            <PressableScale onPress={() => openMeeting(m.task_id)} scaleTo={0.98} accessibilityLabel={[m.due_at ? timeOfDay(m.due_at, locale) : null, m.title, m.contact_name].filter(Boolean).join(". ")} style={styles.body}>
              <View style={styles.timeRow}>
                <View style={[styles.timeBadge, { backgroundColor: soon ? colors.primaryFill : colors.primarySubtle }]}>
                  <Text variant="footnote" weight="bold" numeric style={{ color: soon ? colors.onPrimary : colors.primaryText }}>
                    {m.due_at ? timeOfDay(m.due_at, locale) : "—"}
                  </Text>
                </View>
              </View>
              <Text variant="headline" numberOfLines={1}>
                {m.title}
              </Text>
              <Text variant="subhead" tone="muted" numberOfLines={1}>
                {[m.contact_name, m.company].filter(Boolean).join(" · ") || " "}
              </Text>
            </PressableScale>
            {m.join_url ? (
              <Button label={t("today.join")} icon={Video} size="sm" variant={soon ? "primary" : "secondary"} onPress={() => void Linking.openURL(m.join_url!)} style={styles.join} />
            ) : (
              <View style={styles.joinSpace} />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, gap: space.md, paddingBottom: space.sm },
  card: { width: 232 },
  body: { gap: space.xs },
  timeRow: { flexDirection: "row", marginBottom: space.xs },
  timeBadge: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm },
  join: { marginTop: space.sm },
  joinSpace: { height: 36 + space.sm },
});
