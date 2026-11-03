import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { dayKey, nextDays, timeSlots } from "@/lib/when";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Chip } from "./Chip";
import { Text } from "./Text";

export type When = { day: string; time: string } | null;

/**
 * Day pills (two weeks from today) and the free half-hour slots of the picked day — thumb-friendly, the same on
 * every platform, no native date picker. `allowNone` adds "No date" (tasks). A value outside the two weeks
 * (an existing far-off date) shows as its own pill so it stays selected.
 */
export function WhenPicker({ value, onChange, allowNone, days = 14 }: { value: When; onChange: (v: When) => void; allowNone?: boolean; days?: number }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const [now] = useState(() => new Date());
  const today = dayKey(now);
  const list = useMemo(() => {
    const base = nextDays(now, days);
    if (value && !base.some((d) => d.key === value.day)) {
      const [y, m, d] = value.day.split("-").map(Number);
      base.push({ key: value.day, date: new Date(y!, (m ?? 1) - 1, d ?? 1) });
    }
    return base;
  }, [now, days, value]);

  const slots = value ? timeSlots(value.day, now) : [];
  // Keep an existing time that isn't on the half-hour grid (or already passed today) selectable.
  const shown = value && !slots.includes(value.time) ? [...slots, value.time].sort() : slots;
  const fmtTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m));
  };
  const groups = [
    { key: "morning", label: t("when.morning"), times: shown.filter((s) => s < "12:00") },
    { key: "afternoon", label: t("when.afternoon"), times: shown.filter((s) => s >= "12:00" && s < "17:00") },
    { key: "evening", label: t("when.evening"), times: shown.filter((s) => s >= "17:00") },
  ].filter((g) => g.times.length);

  const pickDay = (key: string) => {
    haptics.selection();
    const free = timeSlots(key, now);
    const keep = value && free.includes(value.time) ? value.time : free.includes("09:00") ? "09:00" : free[0];
    onChange(keep ? { day: key, time: keep } : { day: key, time: "09:00" });
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {allowNone ? <DayPill top={t("when.no")} big="—" bottom={t("when.date")} selected={!value} onPress={() => {
              haptics.selection();
              onChange(null);
            }} /> : null}
        {list.map((d) => {
          const selected = value?.day === d.key;
          const diff = d.key === today ? 0 : null;
          return (
            <DayPill
              key={d.key}
              top={diff === 0 ? t("when.today") : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d.date)}
              big={String(d.date.getDate())}
              bottom={new Intl.DateTimeFormat(locale, { month: "short" }).format(d.date)}
              selected={selected}
              onPress={() => pickDay(d.key)}
              muted={timeSlots(d.key, now).length === 0}
            />
          );
        })}
      </ScrollView>

      {value ? (
        groups.length ? (
          groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text variant="caption" tone="muted" style={styles.groupLabel}>
                {g.label}
              </Text>
              <TimeRow
                times={g.times}
                selected={value.time}
                label={fmtTime}
                onPick={(time) => {
                  haptics.selection();
                  onChange({ day: value.day, time });
                }}
              />
            </View>
          ))
        ) : (
          <Text variant="footnote" tone="muted" style={{ color: colors.textMuted }}>
            {t("when.dayOver")}
          </Text>
        )
      ) : null}
    </View>
  );
}

/** One part of the day as a single scrollable row (keeps the picker three rows tall), the picked time in view. */
function TimeRow({ times, selected, label, onPick }: { times: string[]; selected: string; label: (t: string) => string; onPick: (t: string) => void }) {
  const ref = useRef<ScrollViewInstance>(null);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.times}>
      {times.map((s) => (
        <View key={s} onLayout={s === selected ? (e) => ref.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - space.xl), animated: false }) : undefined}>
          <Chip label={label(s)} selected={selected === s} onPress={() => onPick(s)} />
        </View>
      ))}
    </ScrollView>
  );
}

/** A calendar-style day: weekday, date, month; `dots` marks how much is on that day (up to three). */
export function DayPill({
  top,
  big,
  bottom,
  selected,
  muted,
  dots = 0,
  onPress,
}: {
  top: string;
  big: string;
  bottom: string;
  selected: boolean;
  muted?: boolean;
  dots?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : muted ? colors.textSubtle : colors.text;
  const sub = selected ? colors.onPrimary : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${top} ${big} ${bottom}${dots ? `, ${dots}` : ""}`}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: selected ? colors.primaryFill : pressed ? colors.pressed : colors.surface, borderColor: selected ? colors.primaryFill : colors.border },
      ]}
    >
      <Text variant="caption" style={{ color: sub }} numberOfLines={1}>
        {top}
      </Text>
      <Text variant="headline" numeric style={{ color: fg }}>
        {big}
      </Text>
      {dots > 0 ? (
        <View style={styles.dots}>
          {Array.from({ length: Math.min(dots, 3) }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: selected ? colors.onPrimary : colors.primary }]} />
          ))}
        </View>
      ) : (
        <Text variant="caption" style={{ color: sub }} numberOfLines={1}>
          {bottom}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  days: { gap: space.sm, paddingRight: space.lg },
  pill: { width: 58, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", gap: 1 },
  dots: { flexDirection: "row", gap: 3, height: 16, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  group: { flexDirection: "row", alignItems: "center", gap: space.sm },
  groupLabel: { width: 74 },
  times: { gap: space.sm, paddingRight: space.lg },
});
