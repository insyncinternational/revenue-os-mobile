import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { phaseLabel } from "@/features/calendar/MeetingRow";
import { canJoin, hoursUntil, meetingPhase, type MeetingPhase } from "@/features/calendar/schedule";
import { useMeeting, useMeetingAction } from "@/features/calendar/useMeetings";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { timeOfDay } from "@/lib/format";
import { openContact, openMeetingForm, openMeetingOutcome } from "@/lib/navigate";
import { daysBetween } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { ActionTiles, type TileAction as BarAction } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import {
  Bell,
  CalendarClock,
  CalendarX,
  ChevronRight,
  ExternalLink,
  ICON_STROKE,
  Mail,
  Phone,
  RotateCcw,
  StickyNote,
  Target,
  UserX,
  UserRound,
  Users,
  Video,
  CheckCircle2,
  type IconComponent,
} from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { RowAction } from "@/ui/RowAction";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

const TONE: Record<MeetingPhase, BadgeTone> = {
  upcoming: "brand",
  soon: "brand",
  now: "success",
  needs_outcome: "warning",
  attended: "success",
  no_show: "danger",
  cancelled: "neutral",
};

/** When, who, the one thing to do now (Join / record the outcome), then the details. */
export default function MeetingScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const headerStyle = useAreaHeaderStyle("calendar");
  const locale = getIntlLocale();
  const meeting = useMeeting(id);
  const action = useMeetingAction(id);
  const canEdit = useCan("meetings_edit");
  const [now] = useState(() => Date.now());
  const m = meeting.data?.meeting;

  if (!m) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerStyle }} />
        <Screen>
          {meeting.isPending ? (
            <DelayedFallback>
              <View style={styles.hero}>
                <Backdrop area="calendar" underBar />
                <Skeleton width={120} height={20} />
                <Skeleton width={220} height={28} />
                <Skeleton width={160} height={16} />
              </View>
            </DelayedFallback>
          ) : (
            <View style={styles.errorPad}>
              <ErrorState message={userMessage(meeting.error)} onRetry={() => void meeting.refetch()} />
            </View>
          )}
        </Screen>
      </>
    );
  }

  const phase = meetingPhase(m, now);
  const at = m.due_at ? new Date(m.due_at) : null;
  const days = at ? daysBetween(new Date(now), at) : null;
  const fullDate = at ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(at) : null;
  // "Tomorrow · Tuesday, 4 November": the relative day when it's near, always the date.
  const dayLabel = !at
    ? t("meeting.noTime")
    : days === 0
      ? `${t("when.today")} · ${fullDate}`
      : days === 1
        ? `${t("when.tomorrow")} · ${fullDate}`
        : days === -1
          ? `${t("notif.yesterday")} · ${fullDate}`
          : fullDate!;
  const badge = phaseLabel(phase, m.due_at, now) ?? t("meeting.scheduled");
  const hours = hoursUntil(m, now);
  const pending = m.status === "pending";
  const started = pending && at != null && at.getTime() <= now;
  const joinable = canJoin(m, now);
  const who = m.contact_name || m.company || m.contact_email || null;
  const owners = m.owners.length ? m.owners.map((o) => o.name || "—").join(", ") : m.owner_name;
  const reminder =
    m.reminder_state === "sent" ? t("meeting.reminderSent") : m.reminder_state === "scheduled" ? t("meeting.reminderScheduled") : m.reminder_state === "overdue" ? t("meeting.reminderLate") : null;

  const cancel = async () => {
    if (await confirm(t("meeting.cancelConfirm"), t("meeting.cancel"), t("common.back"), true)) action.mutate({ kind: "cancel" });
  };

  const details = (
    [
      { icon: Users, tone: TILE.primary, label: t("meeting.people"), value: owners },
      { icon: Bell, tone: TILE.warning, label: t("meeting.reminder"), value: pending ? reminder : null },
      { icon: CalendarClock, tone: TILE.info, label: t("meeting.calendarLabel"), value: m.calendar === "google" ? "Google Calendar" : m.calendar === "outlook" ? "Outlook" : m.source === "slotwise" ? "Slotwise" : null },
      { icon: Video, tone: TILE.success, label: t("meeting.link"), value: m.join_url, link: m.join_url },
    ] as { icon: IconComponent; tone: Tile; label: string; value: string | null; link?: string | null }[]
  ).filter((r) => r.value);

  // The one thing to do now, pinned at the bottom: join, record how it went, add notes, or bring it back.
  const glyph = (Icon: IconComponent, color: string) => <Icon size={21} color={color} strokeWidth={ICON_STROKE + 0.25} />;
  const join: BarAction = { key: "join", label: t("today.join"), icon: Video, run: () => void Linking.openURL(m.join_url!) };
  const reschedule: BarAction = { key: "reschedule", label: t("meeting.reschedule"), icon: CalendarClock, run: () => openMeetingForm({ rescheduleId: id }) };
  const bar: { main: BarAction; more: BarAction[] } | null = !canEdit
    ? joinable
      ? { main: join, more: [] }
      : null
    : started || phase === "needs_outcome"
      ? {
          main: { key: "attended", label: t("meeting.attended"), icon: CheckCircle2, run: () => openMeetingOutcome(id, "attended") },
          more: [{ key: "noShow", label: t("meeting.noShow"), glyph: glyph(UserX, colors.warning), run: () => openMeetingOutcome(id, "no_show") }, ...(joinable ? [join] : []), reschedule],
        }
      : pending
        ? {
            main: joinable ? join : reschedule,
            more: [...(joinable ? [reschedule] : []), { key: "cancel", label: t("meeting.cancel"), glyph: glyph(CalendarX, colors.danger), run: () => void cancel() }],
          }
        : m.status === "completed" && m.outcome !== "no_show"
          ? {
              main: { key: "notes", label: m.notes ? t("meeting.editNotes") : t("meeting.addNotes"), icon: StickyNote, run: () => openMeetingOutcome(id, "attended") },
              more: [{ key: "undo", label: t("meeting.undoOutcome"), icon: RotateCcw, run: () => action.mutate({ kind: "reopen" }) }],
            }
          : { main: { key: "reopen", label: m.status === "cancelled" ? t("meeting.restore") : t("meeting.undoOutcome"), icon: RotateCcw, run: () => action.mutate({ kind: "reopen" }) }, more: [] };

  return (
    <>
      <Stack.Screen options={{ title: "", headerStyle }} />
      <Screen onRefresh={() => void meeting.refetch()} refreshing={meeting.isRefetching}>
        <View style={styles.hero}>
          <Backdrop area="calendar" underBar />
          <View style={styles.badgeRow}>
            <Badge label={badge} tone={TONE[phase]} dot={phase === "now" || phase === "soon" || phase === "needs_outcome"} />
            {hours != null ? <Badge label={t("meeting.inHours", { 0: hours })} /> : null}
          </View>
          <Text variant="title" numberOfLines={3} accessibilityRole="header" style={phase === "cancelled" ? styles.struck : undefined}>
            {m.title}
          </Text>
          <View style={styles.when}>
            <Text variant="display" numeric>
              {at ? timeOfDay(at, locale) : "—"}
            </Text>
            <Text variant="callout" tone="secondary">
              {dayLabel}
            </Text>
          </View>
        </View>

        {m.source === "slotwise" && pending && m.manage_url ? (
          <View style={styles.block}>
            <Banner kind="info" message={t("meeting.slotwiseNote")} />
          </View>
        ) : null}

        {/* What to do with this meeting, as tiles in the page. */}
        {bar ? <ActionTiles actions={[bar.main, ...bar.more]} style={styles.tiles} /> : null}

        {m.lead_id ? (
          <Reveal index={0}>
            <SectionHeader title={t("meeting.with")} />
            <Card padded={false} style={styles.card}>
              {/* Who it's with, and one tap to reach them (call, else email) beside the row. */}
              <View style={styles.withRow}>
                <PressableScale onPress={() => openContact(m.lead_id!)} accessibilityLabel={who ?? t("meeting.viewContact")} scaleTo={0.99} style={styles.withMain}>
                  {who ? (
                    <Avatar name={who} size={40} />
                  ) : (
                    <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
                      <UserRound size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <Text variant="callout" weight="semibold" numberOfLines={1}>
                      {who ?? t("meeting.viewContact")}
                    </Text>
                    {m.contact_name && m.company ? (
                      <Text variant="footnote" tone="muted" numberOfLines={1}>
                        {m.company}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
                </PressableScale>
                {m.contact_phone ? (
                  <RowAction icon={Phone} label={`${t("contacts.call")} ${who ?? ""}`} tone="success" onPress={() => void Linking.openURL(`tel:${m.contact_phone}`)} />
                ) : m.contact_email ? (
                  <RowAction icon={Mail} label={`${t("contacts.email")} ${who ?? ""}`} tone="info" onPress={() => void Linking.openURL(`mailto:${m.contact_email}`)} />
                ) : null}
              </View>
            </Card>
          </Reveal>
        ) : null}

        {details.length ? (
          <Reveal index={1}>
            <SectionHeader title={t("contacts.details")} />
            <Card padded={false} style={styles.card}>
              {details.map((r, i) => (
                <View key={r.label}>
                  {i > 0 ? <Divider inset={space.lg + 36 + space.md} /> : null}
                  <View style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: colors[r.tone.bg] }]}>
                      <r.icon size={16} color={colors[r.tone.fg]} strokeWidth={ICON_STROKE} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="caption" tone="muted">
                        {r.label}
                      </Text>
                      <Text variant="body" tone={r.link ? "primary" : "default"} numberOfLines={2} onPress={r.link ? () => void Linking.openURL(r.link!) : undefined}>
                        {r.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </Reveal>
        ) : null}

        {m.notes || m.next_step || m.description ? (
          <Reveal index={2}>
            <SectionHeader title={t("meeting.notes")} />
            <Card style={styles.card} contentStyle={styles.notes}>
              {m.next_step ? (
                <View style={styles.nextStep}>
                  <Target size={16} color={colors.primary} strokeWidth={ICON_STROKE} />
                  <Text variant="callout" weight="semibold" style={styles.flex}>
                    {m.next_step}
                  </Text>
                </View>
              ) : null}
              {m.notes || m.description ? (
                <Text variant="body" tone="secondary" selectable>
                  {m.notes || m.description}
                </Text>
              ) : null}
            </Card>
          </Reveal>
        ) : null}

        {m.manage_url ? (
          <Reveal index={3}>
            <View style={styles.more}>
              <Button label={t("meeting.openSlotwise")} icon={ExternalLink} variant="ghost" onPress={() => void Linking.openURL(m.manage_url!)} />
            </View>
          </Reveal>
        ) : null}
      </Screen>
    </>
  );
}

type Tile = { bg: keyof Palette; fg: keyof Palette };
/** Each detail's icon on a tint of its own colour (people, reminder, calendar, link). */
const TILE = {
  primary: { bg: "primarySubtle", fg: "primary" },
  warning: { bg: "surfaceTertiary", fg: "text" },
  info: { bg: "surfaceTertiary", fg: "text" },
  success: { bg: "surfaceTertiary", fg: "text" },
} as const satisfies Record<string, Tile>;

const styles = StyleSheet.create({
  tiles: { marginTop: space.lg, marginBottom: space.xs },
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.sm, overflow: "hidden" },
  badgeRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  when: { gap: 2, marginTop: space.xs },
  struck: { textDecorationLine: "line-through" },
  block: { paddingHorizontal: gutter, marginTop: space.md },
  card: { marginHorizontal: gutter },
  withRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.lg },
  withMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, paddingRight: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  notes: { gap: space.sm },
  nextStep: { flexDirection: "row", alignItems: "center", gap: space.sm },
  more: { paddingHorizontal: gutter, paddingTop: space.xl, gap: space.xs, alignItems: "center" },
  errorPad: { paddingTop: space.xxl },
});
