import { Linking, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import type { Meeting } from "@/types/calendar";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { ICON_STROKE, Video } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { canJoin, meetingPhase, meetingWith, type MeetingPhase } from "./schedule";

const PHASE: Record<MeetingPhase, { edge: keyof Palette; tone: BadgeTone | null }> = {
  upcoming: { edge: "primary", tone: null },
  soon: { edge: "primary", tone: "brand" },
  now: { edge: "success", tone: "success" },
  needs_outcome: { edge: "warning", tone: "warning" },
  attended: { edge: "success", tone: "success" },
  no_show: { edge: "danger", tone: "danger" },
  cancelled: { edge: "textSubtle", tone: "neutral" },
};

/** "In 12 min", "Now", "Needs outcome", "Attended"… (nothing for a plain upcoming meeting). */
export function phaseLabel(phase: MeetingPhase, dueAt: string | null, now: number): string | null {
  switch (phase) {
    case "soon":
      return t("meeting.inMinutes", { n: Math.max(1, Math.round(((dueAt ? Date.parse(dueAt) : now) - now) / 60_000)) });
    case "now":
      return t("meeting.now");
    case "needs_outcome":
      return t("meeting.needsOutcome");
    case "attended":
      return t("meeting.attended");
    case "no_show":
      return t("meeting.noShow");
    case "cancelled":
      return t("meeting.cancelled");
    default:
      return null;
  }
}

/**
 * One meeting in a list: time first (what people scan for), who it's with, where it stands. Join sits beside the
 * row once it's close; meetings waiting for an outcome get Attended / No-show right under it.
 */
export function MeetingRow({
  meeting: m,
  now,
  locale,
  onOpen,
  onOutcome,
}: {
  meeting: Meeting;
  now: number;
  locale: string;
  onOpen: (m: Meeting) => void;
  onOutcome?: (m: Meeting, outcome: "attended" | "no_show") => void;
}) {
  const { colors } = useTheme();
  const phase = meetingPhase(m, now);
  const style = PHASE[phase];
  const badge = phaseLabel(phase, m.due_at, now);
  const joinable = canJoin(m, now);
  const askOutcome = onOutcome && (phase === "now" || phase === "needs_outcome");
  const closed = phase === "cancelled";
  const who = meetingWith(m);

  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: "transparent" }]}>
      <View style={styles.top}>
        <PressableScale
          onPress={() => onOpen(m)}
          scaleTo={0.985}
          accessibilityLabel={[m.due_at ? timeOfDay(m.due_at, locale) : null, m.title, who, badge].filter(Boolean).join(". ")}
          style={styles.main}
        >
          <View style={styles.time}>
            <Text variant="callout" weight="semibold" numeric tone={closed ? "subtle" : "default"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {m.due_at ? timeOfDay(m.due_at, locale) : "—"}
            </Text>
          </View>
          <View style={[styles.edge, { backgroundColor: colors[style.edge] }]} />
          <View style={styles.body}>
            <Text variant="callout" weight="semibold" numberOfLines={1} tone={closed ? "muted" : "default"} style={closed ? styles.struck : undefined}>
              {m.title}
            </Text>
            {who ? (
              <Text variant="subhead" tone="muted" numberOfLines={1}>
                {who}
              </Text>
            ) : null}
            {badge && style.tone ? (
              <View style={styles.badges}>
                <Badge label={badge} tone={style.tone} />
              </View>
            ) : null}
          </View>
        </PressableScale>
        {joinable ? (
          <IconButton icon={Video} label={t("today.join")} tone="primary" onPress={() => void Linking.openURL(m.join_url!)} />
        ) : m.join_url && phase === "upcoming" ? (
          <View style={styles.hasLink} accessibilityLabel={t("meeting.hasLink")}>
            <Video size={16} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
          </View>
        ) : null}
      </View>
      {askOutcome ? (
        <View style={[styles.outcome, { borderTopColor: colors.borderLight }]}>
          <Text variant="footnote" tone="muted" style={styles.ask}>
            {t("meeting.howDidItGo")}
          </Text>
          <Button label={t("meeting.attended")} size="sm" variant="secondary" onPress={() => onOutcome(m, "attended")} />
          <Button label={t("meeting.noShow")} size="sm" variant="secondary" onPress={() => onOutcome(m, "no_show")} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { marginHorizontal: gutter, marginBottom: space.sm, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", paddingRight: space.xs },
  main: { flex: 1, flexDirection: "row", alignItems: "stretch", gap: space.md, paddingVertical: space.md, paddingLeft: space.md },
  // Wide enough for "11:00 AM"; a longer time (large text, other languages) shrinks a little rather than cut off.
  time: { width: 88, paddingTop: 1 },
  edge: { width: 3, borderRadius: 2 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  badges: { flexDirection: "row", marginTop: space.xs },
  struck: { textDecorationLine: "line-through" },
  hasLink: { width: 44, alignItems: "center" },
  outcome: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderTopWidth: 1 },
  ask: { flex: 1 },
});
