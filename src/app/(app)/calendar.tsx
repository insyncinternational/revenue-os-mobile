import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { MeetingRow } from "@/features/calendar/MeetingRow";
import { agenda, countByDay, withNowLine, type AgendaItem } from "@/features/calendar/schedule";
import { STRIP_DAYS, useMeetingList, useMeetingStrip, useMeetingsSummary } from "@/features/calendar/useMeetings";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { openMeeting, openMeetingForm, openMeetingOutcome } from "@/lib/navigate";
import { dayKey, nextDays } from "@/lib/when";
import { useOnline } from "@/query/useOnline";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import type { Meeting, MeetingView } from "@/types/calendar";
import { HeaderAction } from "@/ui/HeaderAction";
import { CalendarCheck, CalendarDays, CalendarPlus } from "@/ui/icons";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";
import { DayPill } from "@/ui/WhenPicker";

type Tab = Exclude<MeetingView, "cancelled">;

/** Agenda (two-week day strip + upcoming), meetings waiting for an outcome, and past ones. */
export default function CalendarScreen() {
  const headerTint = useAreaHeaderStyle("calendar");
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const canEdit = useCan("meetings_edit");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [day, setDay] = useState<string | null>(null);
  // Phases ("in 12 min", "needs outcome") are read against one clock per visit; pull to refresh renews it.
  const [now, setNow] = useState(() => Date.now());

  const summary = useMeetingsSummary();
  const strip = useMeetingStrip(tab === "upcoming");
  const list = useMeetingList(tab, !(tab === "upcoming" && day));

  const days = useMemo(() => nextDays(new Date(now), STRIP_DAYS), [now]);
  const counts = useMemo(() => countByDay(strip.data?.meetings ?? []), [strip.data]);
  const dayMeetings = useMemo(() => (day ? (strip.data?.meetings ?? []).filter((m) => m.due_at && dayKey(new Date(m.due_at)) === day) : []), [day, strip.data]);
  const shown = tab === "upcoming" && day ? dayMeetings : list.meetings;
  // Upcoming reads as a timeline: a red "now" line sits just before the next meeting.
  const items = useMemo(() => (tab === "upcoming" ? withNowLine(agenda(shown, new Date(now)), now) : agenda(shown, new Date(now))), [shown, now, tab]);
  const loading = tab === "upcoming" && day ? strip.isPending : list.isPending;
  const failed = tab === "upcoming" && day ? strip.isError : list.isError;
  const needs = summary.data?.needs_outcome ?? 0;

  const refresh = () => {
    setNow(Date.now());
    void summary.refetch();
    void strip.refetch();
    void list.refetch();
  };
  const outcome = (m: Meeting, o: "attended" | "no_show") => openMeetingOutcome(m.id, o);

  const headerLabel = (item: Extract<AgendaItem, { type: "header" }>) =>
    item.day === "today"
      ? t("when.today")
      : item.day === "tomorrow"
        ? t("when.tomorrow")
        : item.day === "yesterday"
          ? t("notif.yesterday")
          : item.date
            ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(item.date))
            : t("meeting.noTime");

  const empty =
    tab === "needs_outcome"
      ? { icon: CalendarCheck, title: t("meeting.allRecorded"), message: t("meeting.allRecordedMessage") }
      : tab === "past"
        ? { icon: CalendarDays, title: t("meeting.noPast"), message: t("meeting.noPastMessage") }
        : day
          ? { icon: CalendarDays, title: t("meeting.freeDay"), message: t("meeting.freeDayMessage") }
          : { icon: CalendarDays, title: t("meeting.noUpcoming"), message: t("meeting.noUpcomingMessage") };

  return (
    <>
      <Stack.Screen options={{ headerStyle: headerTint, title: t("calendar.title"), headerRight: () => (canEdit ? <HeaderAction size={40} label={t("meeting.new")} icon={CalendarPlus} onPress={() => openMeetingForm()} /> : null) }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={items}
          keyExtractor={(i) => i.key}
          getItemType={(i) => i.type}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={refresh}
          refreshing={(list.isRefetching && !list.isFetchingNextPage) || strip.isRefetching}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!(tab === "upcoming" && day) && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              <Backdrop area="calendar" underBar />
              <View style={styles.block}>
                <SegmentedControl<Tab>
                  value={tab}
                  onChange={(v) => {
                    setTab(v);
                    setDay(null);
                  }}
                  options={[
                    { key: "upcoming", label: t("meeting.upcoming") },
                    { key: "needs_outcome", label: needs ? `${t("meeting.toRecord")} · ${needs}` : t("meeting.toRecord") },
                    { key: "past", label: t("meeting.past") },
                  ]}
                />
              </View>
              {tab === "upcoming" ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                    {days.map((d, i) => (
                      <DayPill
                        key={d.key}
                        top={i === 0 ? t("when.today") : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d.date)}
                        big={String(d.date.getDate())}
                        bottom={new Intl.DateTimeFormat(locale, { month: "short" }).format(d.date)}
                        dots={counts.get(d.key) ?? 0}
                        selected={day === d.key}
                        onPress={() => {
                          haptics.selection();
                          setDay((cur) => (cur === d.key ? null : d.key));
                        }}
                      />
                    ))}
                  </ScrollView>
                  <Text variant="footnote" tone="muted" style={styles.hint}>
                    {day ? t("meeting.showingDay", { count: dayMeetings.length }) : summary.data ? t("meeting.weekSummary", { today: summary.data.today, week: summary.data.next_7_days }) : " "}
                  </Text>
                </>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <DelayedFallback>
                <SkeletonList rows={5} />
              </DelayedFallback>
            ) : failed ? (
              <ErrorState offline={!online} message={online ? userMessage(list.error ?? strip.error) : undefined} onRetry={refresh} />
            ) : (
              <EmptyState area="calendar"
                icon={empty.icon}
                title={empty.title}
                message={empty.message}
              />
            )
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <SkeletonList rows={2} />
            ) : (
              <View style={styles.footer}>
                {tab === "upcoming" && day && strip.data?.truncated ? (
                  // The day strip loads up to the server's cap; a very busy stretch says so instead of looking empty.
                  <Text variant="footnote" tone="muted" align="center">
                    {t("calendar.truncated", { count: strip.data.meetings.length })}
                  </Text>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) =>
            item.type === "now" ? (
              <NowLine now={now} locale={locale} />
            ) : item.type === "header" ? (
              <Text variant="footnote" weight="semibold" tone="muted" style={styles.day} accessibilityRole="header">
                {headerLabel(item).toUpperCase()}
              </Text>
            ) : (
              <MeetingRow meeting={item.meeting} now={now} locale={locale} onOpen={(m) => openMeeting(m.id)} onOutcome={canEdit ? outcome : undefined} />
            )
          }
        />
      </View>
    </>
  );
}

/** Where "now" falls in the agenda: a red dot and line with the time, like a calendar's current-time marker. */
function NowLine({ now, locale }: { now: number; locale: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.now} accessibilityLabel={`${t("calendar.now")} ${timeOfDay(new Date(now), locale)}`}>
      <Text variant="caption" weight="semibold" numeric style={{ color: colors.danger }}>
        {`${t("calendar.now")} · ${timeOfDay(new Date(now), locale)}`}
      </Text>
      <View style={[styles.nowDot, { backgroundColor: colors.danger }]} />
      <View style={[styles.nowLine, { backgroundColor: colors.danger }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  now: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: gutter + space.xs, paddingTop: space.md, paddingBottom: space.xs },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowLine: { flex: 1, height: 1.5, borderRadius: 1 },
  header: { paddingTop: space.sm, gap: space.md },
  block: { paddingHorizontal: gutter },
  strip: { paddingHorizontal: gutter, gap: space.sm },
  hint: { paddingHorizontal: gutter },
  day: { paddingHorizontal: gutter + space.xs, paddingTop: space.lg, paddingBottom: space.sm, letterSpacing: 0.4 },
  footer: { minHeight: 96, paddingTop: space.lg, paddingHorizontal: gutter },
});
