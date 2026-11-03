import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { phaseLabel } from "@/features/calendar/MeetingRow";
import { canJoin, meetingPhase, type MeetingPhase } from "@/features/calendar/schedule";
import { useMeeting, useMeetingAction } from "@/features/calendar/useMeetings";
import { ActionCircle } from "@/features/contacts/ActionCircle";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { timeOfDay } from "@/lib/format";
import { openContact, openMeetingForm, openMeetingOutcome } from "@/lib/navigate";
import { daysBetween } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { GradientFill } from "@/ui/Gradient";
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
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

const WASH: Record<MeetingPhase, keyof Palette> = {
  upcoming: "primarySubtle",
  soon: "primarySubtle",
  now: "successSurface",
  needs_outcome: "warningSurface",
  attended: "successSurface",
  no_show: "dangerSurface",
  cancelled: "surfaceTertiary",
};
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
  const locale = getIntlLocale();
  const meeting = useMeeting(id);
  const action = useMeetingAction(id);
  const canEdit = useCan("meetings_edit");
  const [now] = useState(() => Date.now());
  const m = meeting.data?.meeting;

  if (!m) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <Screen>
          {meeting.isPending ? (
            <DelayedFallback>
              <View style={styles.hero}>
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
  const dayLabel = !at
    ? t("meeting.noTime")
    : days === 0
      ? t("when.today")
      : days === 1
        ? t("when.tomorrow")
        : days === -1
          ? t("notif.yesterday")
          : new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(at);
  const badge = phaseLabel(phase, m.due_at, now) ?? t("meeting.scheduled");
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
      { icon: Users, label: t("meeting.people"), value: owners },
      { icon: Bell, label: t("meeting.reminder"), value: pending ? reminder : null },
      { icon: CalendarClock, label: t("meeting.calendarLabel"), value: m.calendar === "google" ? "Google Calendar" : m.calendar === "outlook" ? "Outlook" : m.source === "slotwise" ? "Slotwise" : null },
      { icon: Video, label: t("meeting.link"), value: m.join_url, link: m.join_url },
    ] as { icon: IconComponent; label: string; value: string | null; link?: string | null }[]
  ).filter((r) => r.value);

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen onRefresh={() => void meeting.refetch()} refreshing={meeting.isRefetching}>
        <View style={styles.hero}>
          <GradientFill from={colors[WASH[phase]]} to={colors.background} vertical />
          <View style={styles.badgeRow}>
            <Badge label={badge} tone={TONE[phase]} />
          </View>
          <Text variant="title" numberOfLines={3} accessibilityRole="header" style={phase === "cancelled" ? styles.struck : undefined}>
            {m.title}
          </Text>
          <View style={styles.when}>
            <Text variant="largeTitle" numeric>
              {at ? timeOfDay(at, locale) : "—"}
            </Text>
            <Text variant="callout" tone="secondary">
              {dayLabel}
            </Text>
          </View>

          {canEdit ? (
            <View style={styles.actions}>
              {started || phase === "needs_outcome" ? (
                <>
                  <Button label={t("meeting.attended")} icon={CheckCircle2} onPress={() => openMeetingOutcome(id, "attended")} style={styles.flexBtn} />
                  <Button label={t("meeting.noShow")} icon={UserX} variant="secondary" onPress={() => openMeetingOutcome(id, "no_show")} style={styles.flexBtn} />
                </>
              ) : pending ? (
                <>
                  {joinable ? <Button label={t("today.join")} icon={Video} onPress={() => void Linking.openURL(m.join_url!)} style={styles.flexBtn} /> : null}
                  <Button label={t("meeting.reschedule")} icon={CalendarClock} variant="secondary" onPress={() => openMeetingForm({ rescheduleId: id })} style={styles.flexBtn} />
                </>
              ) : m.status === "completed" && m.outcome !== "no_show" ? (
                <Button label={m.notes ? t("meeting.editNotes") : t("meeting.addNotes")} icon={StickyNote} variant="secondary" onPress={() => openMeetingOutcome(id, "attended")} style={styles.flexBtn} />
              ) : null}
            </View>
          ) : joinable ? (
            <View style={styles.actions}>
              <Button label={t("today.join")} icon={Video} onPress={() => void Linking.openURL(m.join_url!)} style={styles.flexBtn} />
            </View>
          ) : null}
          {canEdit && started && joinable ? <Button label={t("today.join")} icon={Video} variant="ghost" onPress={() => void Linking.openURL(m.join_url!)} /> : null}
        </View>

        {m.source === "slotwise" && pending && m.manage_url ? (
          <View style={styles.block}>
            <Banner kind="info" message={t("meeting.slotwiseNote")} />
          </View>
        ) : null}

        {m.lead_id ? (
          <Reveal index={0}>
            <SectionHeader title={t("meeting.with")} />
            <Card padded={false} style={styles.card}>
              <PressableScale onPress={() => openContact(m.lead_id!)} accessibilityLabel={who ?? t("meeting.viewContact")} scaleTo={0.99} style={styles.row}>
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
              {m.contact_phone || m.contact_email ? (
                <>
                  <Divider />
                  <View style={styles.reach}>
                    <ActionCircle icon={Phone} label={t("contacts.call")} disabled={!m.contact_phone} onPress={() => m.contact_phone && void Linking.openURL(`tel:${m.contact_phone}`)} />
                    <ActionCircle icon={Mail} label={t("contacts.email")} disabled={!m.contact_email} onPress={() => m.contact_email && void Linking.openURL(`mailto:${m.contact_email}`)} />
                  </View>
                </>
              ) : null}
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
                    <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
                      <r.icon size={16} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
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

        {canEdit || m.manage_url ? (
          <Reveal index={3}>
            <View style={styles.more}>
              {m.manage_url ? <Button label={t("meeting.openSlotwise")} icon={ExternalLink} variant="ghost" onPress={() => void Linking.openURL(m.manage_url!)} /> : null}
              {canEdit && started ? <Button label={t("meeting.reschedule")} icon={CalendarClock} variant="ghost" onPress={() => openMeetingForm({ rescheduleId: id })} /> : null}
              {canEdit && !pending ? (
                <Button
                  label={m.status === "cancelled" ? t("meeting.restore") : t("meeting.undoOutcome")}
                  icon={RotateCcw}
                  variant="ghost"
                  loading={action.isPending && action.variables?.kind === "reopen"}
                  onPress={() => action.mutate({ kind: "reopen" })}
                />
              ) : null}
              {canEdit && pending ? <Button label={t("meeting.cancel")} icon={CalendarX} variant="ghost" onPress={() => void cancel()} /> : null}
            </View>
          </Reveal>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.sm, overflow: "hidden" },
  badgeRow: { flexDirection: "row" },
  when: { gap: 2, marginTop: space.xs },
  actions: { flexDirection: "row", gap: space.sm, alignItems: "center", marginTop: space.md },
  flexBtn: { flex: 1, alignSelf: "auto" },
  struck: { textDecorationLine: "line-through" },
  block: { paddingHorizontal: gutter, marginTop: space.md },
  card: { marginHorizontal: gutter },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  reach: { flexDirection: "row", gap: space.xl, paddingVertical: space.md, paddingHorizontal: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  notes: { gap: space.sm },
  nextStep: { flexDirection: "row", alignItems: "center", gap: space.sm },
  more: { paddingHorizontal: gutter, paddingTop: space.xl, gap: space.xs, alignItems: "center" },
  errorPad: { paddingTop: space.xxl },
});
