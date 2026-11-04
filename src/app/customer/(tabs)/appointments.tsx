import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { portalApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { splitMeetings } from "@/portal/portal";
import { CustomerHeader } from "@/portal/CustomerHeader";
import { openBook } from "@/portal/navigate";
import { usePortalAction, usePortalMeetings } from "@/portal/usePortal";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { dateTime } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import type { PortalMeeting } from "@/types/portal";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { CalendarDays, CalendarPlus, Video } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";

/** The customer's appointments with the business: book, move, cancel, join; then the past ones. */
export default function CustomerAppointments() {
  const online = useOnline();
  const locale = getIntlLocale();
  const meetings = usePortalMeetings();
  const [now] = useState(() => Date.now());
  const cancel = usePortalAction((token, id: number) => portalApi.cancel(token, id), { success: t("portal.appt.canceled") });
  const { upcoming, past } = splitMeetings(meetings.data?.meetings ?? [], now);

  const askCancel = async (m: PortalMeeting) => {
    if (await confirm(t("portal.appt.cancelAsk", { when: m.starts_at ? dateTime(m.starts_at, locale) : m.title }), t("portal.appt.cancel"), t("portal.appt.keep"), true)) cancel.mutate(m.id);
  };

  return (
    <Screen contentInsetAdjustmentBehavior="never" onRefresh={() => void meetings.refetch()} refreshing={meetings.isRefetching}>
      <CustomerHeader title={t("portal.tabs.appointments")} summary={upcoming.length ? t("portal.appt.upcomingCount", { count: upcoming.length }) : t("portal.appt.summary")}>
        <Button label={t("portal.quick.book")} icon={CalendarPlus} onPress={() => openBook()} />
      </CustomerHeader>
      {!online ? <OfflineBanner /> : null}

      {!meetings.data ? (
        meetings.isError ? <ErrorState message={userMessage(meetings.error)} onRetry={() => void meetings.refetch()} /> : <SkeletonList rows={4} />
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("portal.appt.emptyTitle")} message={t("portal.appt.emptyMessage")} />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <>
              <SectionHeader title={t("portal.appt.upcoming")} />
              <View style={styles.list}>
                {upcoming.map((m) => (
                  <Card key={m.id} contentStyle={styles.appt}>
                    <ListRow title={m.title} subtitle={m.starts_at ? dateTime(m.starts_at, locale) : undefined} leading={<CalendarDays size={22} />} />
                    <View style={styles.actions}>
                      {m.join_url ? <Button label={t("portal.appt.join")} icon={Video} size="sm" onPress={() => void Linking.openURL(m.join_url!)} /> : null}
                      <Button label={t("portal.appt.reschedule")} size="sm" variant="secondary" onPress={() => openBook(m.id)} />
                      <Button label={t("portal.appt.cancel")} size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === m.id} onPress={() => void askCancel(m)} />
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}
          {past.length > 0 ? (
            <>
              <SectionHeader title={t("portal.appt.past")} />
              <Card padded={false} style={styles.card}>
                {past.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 ? <Divider inset={gutter} /> : null}
                    <ListRow
                      title={m.title}
                      subtitle={m.starts_at ? dateTime(m.starts_at, locale) : undefined}
                      trailing={m.status === "cancelled" ? <Badge label={t("portal.appt.canceledBadge")} tone="neutral" /> : m.status === "completed" ? <Badge label={t("portal.appt.done")} tone="success" /> : undefined}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
      <View style={styles.footer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: gutter, gap: space.sm },
  appt: { gap: space.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.xs, paddingBottom: space.xs },
  card: { marginHorizontal: gutter },
  footer: { height: space.huge },
});
