import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay, sentenceCase } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { appLinkFor } from "@/lib/links";
import { go, openWebHref } from "@/lib/navigate";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { accentGradient, Sheen } from "@/ui/Gloss";
import type { AiRecommendation, PlanAction, PlanItem } from "@/types/home";
import { ICON_STROKE, Phone, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { actionFor, primaryAction } from "./UpNext";

type Props = { item?: PlanItem; suggestion?: AiRecommendation; onComplete: (taskId: number, itemId: string) => void; label?: string };

/**
 * The one thing to do first, as Today's hero: the accent card (the brand colour, an agency's if set), the only
 * coloured block on the screen so the eye lands here. A task is finished with "slide to mark done" (a call button
 * sits beside the title when there's a number to ring); anything else gets one ink button.
 */
export function NextUp({ item, suggestion, onComplete, label }: Props) {
  const { colors } = useTheme();
  const content = item ? fromItem(item, onComplete) : suggestion ? fromSuggestion(suggestion) : null;
  if (!content) return null;
  const { title, subtitle, action, call, slide } = content;
  const overdue = isPast(item?.due_at);
  const Icon = action?.icon;
  const tag = [label ?? t("today.upNext"), overdue ? t("tasks.overdue") : null].filter(Boolean).join(" · ");
  return (
    <View style={[styles.card, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}>
      <Sheen />
      <View style={[styles.orb, { backgroundColor: colors.primaryTrack }]} />
      <View style={styles.top}>
        <View style={[styles.tag, { backgroundColor: colors.primaryTrack, borderColor: colors.primaryTrack }]}>
          <Text variant="eyebrow" style={{ color: colors.onPrimary }} numberOfLines={1}>
            {tag}
          </Text>
        </View>
        {call ? (
          <PressableScale
            onPress={() => {
              haptics.light();
              call.run();
            }}
            accessibilityRole="button"
            accessibilityLabel={call.label}
            scaleTo={0.9}
            style={[styles.round, { backgroundColor: colors.primaryTrack }]}
          >
            <Phone size={19} color={colors.onPrimary} strokeWidth={ICON_STROKE} />
          </PressableScale>
        ) : null}
      </View>
      <Text variant="title" style={[styles.title, { color: colors.onPrimary }]} numberOfLines={3}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" style={{ color: colors.onPrimaryMuted }} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {action && slide ? (
        <View style={styles.bottom}>
          <SlideToConfirm label={t("today.slideDone")} onConfirm={action.run} />
        </View>
      ) : action ? (
        <PressableScale
          onPress={() => {
            haptics.light();
            action.run();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          scaleTo={0.97}
          style={[styles.button, { backgroundColor: colors.onPrimary }]}
        >
          {Icon ? <Icon size={17} color={colors.primaryFill} strokeWidth={ICON_STROKE + 0.5} /> : null}
          <Text variant="callout" weight="semibold" style={{ color: colors.primaryFill }} numberOfLines={1}>
            {sentenceCase(action.label)}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** "Was due yesterday, 6:00 PM" (today / yesterday / a weekday or date, in the app language). */
function wasDue(due: string): string {
  const locale = getIntlLocale();
  const d = new Date(due);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86_400_000);
  // Our own words for today / yesterday: Hermes (the phone's JS engine) has no Intl.RelativeTimeFormat.
  const day = days <= 0 ? t("today.dueToday") : days === 1 ? t("today.dueYesterday") : new Intl.DateTimeFormat(locale, days < 7 ? { weekday: "long" } : { day: "numeric", month: "short" }).format(d);
  return t("today.wasDue", { when: `${day}, ${timeOfDay(d, locale)}` });
}

/** Whether a due time has passed (read at render: the plan refreshes often enough). */
function isPast(due: string | null | undefined): boolean {
  return due != null && new Date(due).getTime() < Date.now();
}

/** How many plan items the hero pages through; the rest are listed below it. */
export const HERO_ITEMS = 3;

/**
 * The hero when there's more than one thing to do: the first few plan items as pages you swipe through ("Up next ·
 * 1 of 3", dots below), so the next one is a flick away. One item (or only a suggestion) is the plain hero.
 */
export function NextUpCarousel({ items, suggestion, onComplete }: { items: PlanItem[]; suggestion?: AiRecommendation; onComplete: Props["onComplete"] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pages = items.slice(0, HERO_ITEMS);
  if (pages.length <= 1) return <NextUp item={pages[0]} suggestion={pages[0] ? undefined : suggestion} onComplete={onComplete} />;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.carousel}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pages}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {pages.map((item, i) => (
            <View key={item.id} style={{ width }}>
              <NextUp item={item} onComplete={onComplete} label={`${t("today.upNext")} · ${t("today.pageOf", { 0: i + 1, 1: pages.length })}`} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {pages.map((item, i) => (
          <View key={item.id} style={[styles.dot, i === page ? [styles.dotOn, { backgroundColor: colors.ink }] : { backgroundColor: colors.borderStrong }]} />
        ))}
      </View>
    </View>
  );
}

type Action = { label: string; icon?: IconComponent; run: () => void };
/** `slide`: the action finishes a task (slide to confirm); `call`: a phone number to ring beside it. */
type Content = { title: string; subtitle: string | null; action: Action | null; call?: Action | null; slide?: boolean };

function fromItem(item: PlanItem, onComplete: Props["onComplete"]): Content {
  const main = primaryAction(item);
  const open = item.actions.find((a): a is Extract<PlanAction, { kind: "open" }> => a.kind === "open");
  // No action of its own but a screen to open: the button opens it.
  const action = main ? actionFor(main, item.id, onComplete, item.kind === "reply") : null;
  const fallback = !action && open && appLinkFor(open.href) ? { label: t("today.open"), run: () => openWebHref(open.href) } : null;
  const slide = main?.kind === "complete_task";
  const callAction = item.actions.find((a) => a.kind === "call");
  // The call button beside the title only when the main action isn't the call itself.
  const call = callAction && main?.kind !== "call" ? actionFor(callAction, item.id, onComplete) : null;
  // Overdue: say when it was due ("Was due yesterday, 6:00 PM"); the tag already says "Overdue".
  const sub = item.subtitle ?? item.reason;
  const subtitle = isPast(item.due_at) ? wasDue(item.due_at!) : sub && sub.trim().toLowerCase() !== t("tasks.overdue").toLowerCase() ? sub : null;
  return { title: item.title, subtitle, action: action ?? fallback, call, slide };
}

function fromSuggestion(r: AiRecommendation): Content {
  const target = appLinkFor(r.href);
  return { title: r.text, subtitle: null, action: target ? { label: r.action, run: () => go(target) } : null };
}

const styles = StyleSheet.create({
  // Pages stretch to the tallest one, so every card in the row is the same height.
  card: { flexGrow: 1, borderRadius: radius.xxl, padding: space.xl, gap: space.xs, overflow: "hidden" },
  // A soft glass circle in the corner, for depth.
  orb: { position: "absolute", right: -60, top: -70, width: 200, height: 200, borderRadius: 100, opacity: 0.6 },
  carousel: { gap: space.sm },
  pages: { alignItems: "stretch" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { width: 18 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, marginBottom: space.xs },
  tag: { flexShrink: 1, paddingHorizontal: space.sm + 2, paddingVertical: 5, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginStart: space.sm },
  title: { fontSize: 28, lineHeight: 33, letterSpacing: -0.8 },
  bottom: { marginTop: space.lg },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, height: 52, borderRadius: radius.pill, marginTop: space.lg },
});
