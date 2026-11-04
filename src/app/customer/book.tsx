import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { portalApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { slotsByDay } from "@/portal/portal";
import { usePortalAction, usePortalSlots } from "@/portal/usePortal";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useCelebrate } from "@/ui/Celebrate";
import { Chip } from "@/ui/Chip";
import { FormScreen } from "@/ui/FormScreen";
import { CalendarCheck } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { SkeletonList } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";

/** Book a time from the business's free slots, or move an appointment to another (`?reschedule=id`). */
export default function BookSheet() {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const celebrate = useCelebrate();
  const reschedule = Number(useLocalSearchParams<{ reschedule?: string }>().reschedule) || 0;
  const slots = usePortalSlots();
  const days = useMemo(() => slotsByDay(slots.data?.slots ?? []), [slots.data]);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const activeDay = day ?? days[0]?.day ?? null;
  const times = days.find((d) => d.day === activeDay)?.slots ?? [];
  const title = reschedule ? t("portal.appt.reschedule") : t("portal.quick.book");

  const book = usePortalAction((token, startsAt: string) => (reschedule ? portalApi.reschedule(token, reschedule, startsAt) : portalApi.book(token, startsAt)), {
    success: reschedule ? t("portal.book.moved") : t("portal.book.booked"),
    onDone: () => {
      celebrate();
      router.back();
    },
  });

  const dayLabel = (key: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00`));

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FormScreen
        topInset={false}
        sheetTitle={title}
        sticky={
          <Button
            label={slot ? t("portal.book.confirm", { when: `${dayLabel(activeDay ?? "")} ${timeOfDay(slot, locale)}` }) : t("portal.book.pick")}
            icon={CalendarCheck}
            size="lg"
            fullWidth
            disabled={!slot}
            loading={book.isPending}
            onPress={() => slot && book.mutate(slot)}
          />
        }
      >
        {book.error ? <Banner message={userMessage(book.error)} /> : null}
        {slots.isPending ? (
          <SkeletonList rows={4} />
        ) : slots.isError ? (
          <Banner message={userMessage(slots.error)} />
        ) : days.length === 0 ? (
          <Banner kind="info" message={t("portal.book.none")} />
        ) : (
          <>
            <Text variant="subhead" tone="muted">
              {t("portal.book.day")}
            </Text>
            <View style={styles.chips}>
              {days.map((d) => (
                <Chip
                  key={d.day}
                  label={dayLabel(d.day)}
                  selected={d.day === activeDay}
                  onPress={() => {
                    setDay(d.day);
                    setSlot(null);
                  }}
                />
              ))}
            </View>
            <Text variant="subhead" tone="muted">
              {t("portal.book.time")}
            </Text>
            <View style={styles.grid}>
              {times.map((s) => {
                const on = s === slot;
                return (
                  <PressableScale
                    key={s}
                    onPress={() => setSlot(s)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.time, { backgroundColor: on ? colors.primaryFill : colors.surface, borderColor: on ? colors.primaryFill : colors.border }]}
                  >
                    <Text variant="callout" weight="semibold" numeric style={{ color: on ? colors.onPrimary : colors.text }}>
                      {timeOfDay(s, locale)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  time: { width: "31%", flexGrow: 1, alignItems: "center", paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1 },
});
