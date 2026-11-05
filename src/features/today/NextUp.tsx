import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { initials, timeOfDay, sentenceCase } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { appLinkFor } from "@/lib/links";
import { go, openContact, openWebHref } from "@/lib/navigate";
import { dial } from "@/features/contacts/callFollowUp";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { accentGradient, Sheen } from "@/ui/Gloss";
import type { AiRecommendation, CallQueueLead, PlanAction, PlanItem } from "@/types/home";
import { ICON_STROKE, Phone, Sparkles, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { actionFor, primaryAction } from "./UpNext";

/** The people behind a "call these leads" suggestion: the first few, and how many there are in all. */
export type HeroPeople = { leads: CallQueueLead[]; total: number };

type Props = { item?: PlanItem; suggestion?: AiRecommendation; onComplete: (taskId: number, itemId: string) => void; label?: string; people?: HeroPeople };

/**
 * The one thing to do first, as Today's hero: the accent card (the brand colour, an agency's if set), the only
 * coloured block on the screen so the eye lands here. A task is finished with "slide to mark done" (a call button
 * sits beside the title when there's a number to ring); anything else gets one ink button. It says why it's next
 * (the plan's reason), and a "call these leads" suggestion lists the first few people, each with a call button.
 */
export function NextUp({ item, suggestion, onComplete, label, people }: Props) {
  const { colors } = useTheme();
  const content = item ? fromItem(item, onComplete) : suggestion ? fromSuggestion(suggestion) : null;
  if (!content) return null;
  const { title, subtitle, action, call, slide, why } = content;
  const shown = people?.leads.slice(0, 3) ?? [];
  const more = people ? Math.max(0, people.total - shown.length) : 0;
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
      <Text variant="title" style={[styles.title, shown.length > 0 && styles.titleSmall, { color: colors.onPrimary }]} numberOfLines={3}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" style={{ color: colors.onPrimaryMuted }} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {why ? (
        <View style={[styles.why, { backgroundColor: colors.primaryTrack }]}>
          <Sparkles size={14} color={colors.onPrimary} strokeWidth={ICON_STROKE} />
          <Text variant="footnote" weight="medium" style={[styles.whyText, { color: colors.onPrimary }]} numberOfLines={2}>
            {why}
          </Text>
        </View>
      ) : null}
      {shown.length > 0 ? (
        <View style={styles.people}>
          {shown.map((p) => (
            <Person key={p.lead_id} lead={p} />
          ))}
          {more > 0 ? (
            <Text variant="footnote" style={{ color: colors.onPrimaryMuted }}>
              {more === 1 ? t("today.moreNotCalledOne") : t("today.moreNotCalled", { count: more })}
            </Text>
          ) : null}
        </View>
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

/** One person to call, on the hero: initials, name and company (opens the contact), and a round call button. */
function Person({ lead }: { lead: CallQueueLead }) {
  const { colors } = useTheme();
  const name = lead.name ?? lead.phone;
  return (
    <View style={styles.person}>
      <PressableScale onPress={() => openContact(lead.lead_id)} accessibilityRole="button" accessibilityLabel={[name, lead.company].filter(Boolean).join(", ")} scaleTo={0.98} style={styles.personMain}>
        <View style={[styles.initials, { backgroundColor: colors.primaryTrack }]}>
          <Text variant="caption" weight="semibold" style={{ color: colors.onPrimary }}>
            {initials(name)}
          </Text>
        </View>
        <View style={styles.personText}>
          <Text variant="callout" weight="semibold" numberOfLines={1} style={{ color: colors.onPrimary }}>
            {name}
          </Text>
          {lead.company || lead.role ? (
            <Text variant="footnote" numberOfLines={1} style={{ color: colors.onPrimaryMuted }}>
              {lead.company ?? lead.role}
            </Text>
          ) : null}
        </View>
      </PressableScale>
      <PressableScale
        onPress={() => {
          haptics.light();
          dial(lead.phone.replace(/[^\d+]/g, ""), lead.lead_id, name);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t("today.call")} ${name}`}
        scaleTo={0.9}
        style={[styles.callSmall, { backgroundColor: colors.primaryTrack }]}
      >
        <Phone size={17} color={colors.onPrimary} strokeWidth={ICON_STROKE} />
      </PressableScale>
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
export function NextUpCarousel({ items, suggestion, onComplete, people }: { items: PlanItem[]; suggestion?: AiRecommendation; onComplete: Props["onComplete"]; people?: HeroPeople }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pages = items.slice(0, HERO_ITEMS);
  if (pages.length <= 1) return <NextUp item={pages[0]} suggestion={pages[0] ? undefined : suggestion} onComplete={onComplete} people={pages[0] ? undefined : people} />;
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
/** `why`: the plan's reason for the item, shown when the subtitle already says who or what it is. */
type Content = { title: string; subtitle: string | null; action: Action | null; call?: Action | null; slide?: boolean; why?: string | null };

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
  const overdueWord = (s: string | null) => s != null && s.trim().toLowerCase() === t("tasks.overdue").toLowerCase();
  const subtitle = isPast(item.due_at) ? wasDue(item.due_at!) : sub && !overdueWord(sub) ? sub : null;
  // Why it's next ("No activity for 9 days", "They replied and are waiting"), when not already said above.
  const why = item.reason && item.reason !== subtitle && !overdueWord(item.reason) && (item.subtitle || isPast(item.due_at)) ? item.reason : null;
  return { title: item.title, subtitle, action: action ?? fallback, call, slide, why };
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
  titleSmall: { fontSize: 24, lineHeight: 29 },
  why: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, marginTop: space.sm, paddingHorizontal: space.sm + 2, paddingVertical: 6, borderRadius: radius.pill, maxWidth: "100%" },
  whyText: { flexShrink: 1 },
  people: { marginTop: space.md, gap: space.sm },
  person: { flexDirection: "row", alignItems: "center", gap: space.sm },
  personMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  initials: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  personText: { flex: 1, minWidth: 0 },
  callSmall: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bottom: { marginTop: space.lg },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, height: 52, borderRadius: radius.pill, marginTop: space.lg },
});
