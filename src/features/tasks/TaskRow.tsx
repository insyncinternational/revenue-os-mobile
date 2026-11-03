import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { daysBetween } from "@/lib/when";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { CrmTask, TaskType } from "@/types/contact";
import { Check, CheckCircle2, ICON_STROKE, Mail, Phone, RefreshCw, StickyNote, Video, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { SwipeableRow } from "@/ui/SwipeableRow";
import { Text } from "@/ui/Text";
import { taskContact } from "./tasks";

export const TASK_TYPE_ICON: Record<TaskType, IconComponent> = { call: Phone, email: Mail, followup: RefreshCw, meeting: Video, other: StickyNote };

/** "9:00 AM", "Tomorrow, 9:00 AM", "Yesterday, 4:30 PM", "Fri, 9:00 AM", "12 Nov, 9:00 AM". */
export function dueLabel(dueAt: string, now: Date, locale: string): string {
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "";
  const time = timeOfDay(d, locale);
  const days = daysBetween(now, d);
  if (days === 0) return time;
  if (days === 1) return `${t("when.tomorrow")}, ${time}`;
  if (days === -1) return `${t("notif.yesterday")}, ${time}`;
  const day = new Intl.DateTimeFormat(locale, Math.abs(days) < 7 ? { weekday: "short" } : { day: "numeric", month: "short" }).format(d);
  return `${day}, ${time}`;
}

/**
 * One task. The circle completes it (or reopens a finished one); swiping right does the same; tapping the
 * rest opens it. Overdue times are red; high priority gets a flag colour on the circle.
 */
export function TaskRow({
  task,
  now,
  locale,
  onToggle,
  onOpen,
  canEdit,
  showContact = true,
}: {
  task: CrmTask;
  now: Date;
  locale: string;
  onToggle: (task: CrmTask) => void;
  onOpen: (task: CrmTask) => void;
  canEdit: boolean;
  /** Off on the contact's own screen, where every row would repeat their name. */
  showContact?: boolean;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  // Which task this row is ticking: rows are recycled by the list, so another task shows unticked.
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const checking = checkingId === task.id;
  const fill = useSharedValue(0);
  const leave = useSharedValue(0);
  useEffect(() => {
    fill.set(0);
    leave.set(0);
  }, [task.id, fill, leave]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: fill.get() }], opacity: fill.get() }));
  const rowStyle = useAnimatedStyle(() => ({ opacity: 1 - leave.get() * 0.9, transform: [{ translateX: leave.get() * 28 }] }));

  /** Done: the circle fills with a springy check, then the row slides away before it leaves the list. */
  const complete = () => {
    if (checking) return;
    if (reduce) return onToggle(task);
    setCheckingId(task.id);
    haptics.success();
    fill.set(withSpring(1, { damping: 11, stiffness: 240 }));
    setTimeout(() => leave.set(withTiming(1, { duration: 200 })), 300);
    setTimeout(() => onToggle(task), 480);
  };
  const done = task.status === "completed";
  const overdue = !done && !!task.due_at && Date.parse(task.due_at) < now.getTime();
  const Icon = TASK_TYPE_ICON[task.task_type ?? "other"] ?? StickyNote;
  const who = showContact ? taskContact(task) : null;
  const high = task.priority === "high" && !done;
  const ring = done ? colors.success : high ? colors.danger : colors.borderStrong;

  const row = (
    <Animated.View style={[styles.item, { backgroundColor: colors.surface }, rowStyle]}>
      <Pressable
        onPress={() => (done ? onToggle(task) : complete())}
        disabled={!canEdit}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: !canEdit }}
        accessibilityLabel={done ? t("tasks.markNotDone") : t("tasks.markDone")}
        style={({ pressed }) => [styles.check, { borderColor: checking ? colors.success : ring, backgroundColor: done ? colors.success : pressed ? colors.pressed : "transparent" }]}
      >
        {done ? (
          <Check size={15} color={colors.onPrimary} strokeWidth={3} />
        ) : (
          <Animated.View style={[styles.fill, { backgroundColor: colors.success }, fillStyle]}>
            <Check size={15} color={colors.onPrimary} strokeWidth={3} />
          </Animated.View>
        )}
      </Pressable>
      <PressableScale onPress={() => onOpen(task)} scaleTo={0.985} style={styles.body} accessibilityLabel={[task.title, task.due_at ? dueLabel(task.due_at, now, locale) : null, who].filter(Boolean).join(". ")}>
        <Text variant="callout" weight="medium" numberOfLines={2} tone={done || checking ? "muted" : "default"} style={done || checking ? styles.struck : undefined}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          <Icon size={13} color={colors.textMuted} strokeWidth={ICON_STROKE} />
          {task.due_at ? (
            <Text variant="footnote" numeric tone={overdue ? "danger" : "muted"} weight={overdue ? "medium" : undefined}>
              {dueLabel(task.due_at, now, locale)}
            </Text>
          ) : null}
          {who ? (
            <Text variant="footnote" tone="muted" numberOfLines={1} style={styles.who}>
              {task.due_at ? `· ${who}` : who}
            </Text>
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );

  const frame = [styles.space, { borderColor: colors.border }];
  if (!canEdit || done) return <View style={frame}>{row}</View>;
  // The swipe area spans the full width (inset swipe areas measure wrong on web); the card keeps its margins inside,
  // on an opaque page-coloured layer so the action panel never shows in the gutters or past the corners.
  return (
    <SwipeableRow id={task.id} left={{ label: t("today.done"), icon: CheckCircle2, color: colors.success, onTrigger: complete, removes: true }}>
      <View style={{ backgroundColor: colors.background }}>
        <View style={frame}>{row}</View>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  space: { marginHorizontal: gutter, marginBottom: space.sm, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingLeft: space.md },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: space.md + 1 },
  body: { flex: 1, minWidth: 0, gap: 3, paddingVertical: space.md, paddingRight: space.md },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs },
  who: { flexShrink: 1 },
  struck: { textDecorationLine: "line-through" },
});
