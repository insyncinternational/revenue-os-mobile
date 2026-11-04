import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t, type TranslationKey } from "@/i18n";
import { greetingKey } from "@/lib/greeting";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { MyDayCounter } from "@/types/home";
import { Calendar, ICON_STROKE, MessageCircle, Phone, type IconComponent } from "@/ui/icons";
import { useHeaderChip } from "@/ui/headerChip";
import { Backdrop } from "@/ui/Backdrop";
import { HeroTopBar } from "@/ui/HeroTopBar";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/**
 * The three counters worth a glance first thing; the rest live in "Up next". The app's own labels, which say
 * these are today's to-dos, so they never read as the period totals in Performance ("Positive replies",
 * "Meetings booked") further down.
 */
const HERO_COUNTERS: { key: string; icon: IconComponent; label: TranslationKey }[] = [
  { key: "meetings", icon: Calendar, label: "today.counter.meetings" },
  { key: "replies", icon: MessageCircle, label: "today.counter.replies" },
  { key: "calls_due", icon: Phone, label: "today.counter.calls" },
];

/** One pill's text, written as a short sentence like the mock ("1 meeting today"); other counters keep "N label". */
function pillText(key: string, count: number, label: TranslationKey): string {
  if (key === "meetings") return count === 1 ? t("today.meetingTodayOne") : t("today.meetingsTodayCount", { count });
  return `${count} ${t(label)}`;
}

/** `approvals`: AI drafts and actions waiting for an OK (the first pill, with an accent dot). */
type Props = { counters: MyDayCounter[] | null; headline: string | null; onCounter?: (key: string) => void; approvals?: number; onApprovals?: () => void };

/**
 * Today's header (Mono look): the top bar, "Good afternoon," with the first name big under it, then the day's
 * counters as small white pills (an accent dot on the urgent ones). The day in one sentence shows only when no
 * counter is live, so the header never says the same thing twice.
 */
export function Hero({ counters, headline, onCounter, approvals = 0, onApprovals }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const chip = useHeaderChip();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";
  const greeting = t(greetingKey(new Date().getHours()));
  const live = liveCounters(HERO_COUNTERS.map((h) => h.key), counters);
  // Two pills at most (the mock): the AI replies pill takes one of the two places when it shows.
  const shown = HERO_COUNTERS.flatMap((h) => {
    const c = live.find((x) => x.key === h.key);
    return c ? [{ ...h, c }] : [];
  }).slice(0, approvals > 0 ? 1 : 2);

  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
      <Backdrop area="today" />
      <HeroTopBar />
      <View style={styles.hello} accessible accessibilityRole="header" accessibilityLabel={firstName ? `${greeting}, ${firstName}` : greeting}>
        <Text variant="callout" style={{ color: colors.textMuted }}>
          {firstName ? `${greeting},` : greeting}
        </Text>
        {firstName ? (
          <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text }}>
            {firstName}.
          </Text>
        ) : null}
      </View>
      {shown.length > 0 || approvals > 0 ? (
        <View style={styles.tiles}>
          {approvals > 0 ? (
            <PressableScale onPress={onApprovals} accessibilityLabel={approvals === 1 ? t("today.aiReplyOne") : t("today.aiReplies", { count: approvals })} style={[styles.tile, chip]}>
              <View style={[styles.urgent, { backgroundColor: colors.primaryFill }]} />
              <Text variant="footnote" weight="medium" numberOfLines={1} style={{ color: colors.text, flexShrink: 1 }}>
                {approvals === 1 ? t("today.aiReplyOne") : t("today.aiReplies", { count: approvals })}
              </Text>
            </PressableScale>
          ) : null}
          {shown.map(({ key, icon: Icon, label, c }) => (
            <PressableScale key={key} onPress={() => onCounter?.(key)} accessibilityLabel={`${t(label)}: ${c.count}`} style={[styles.tile, chip]}>
              {c.urgent ? <View style={[styles.urgent, { backgroundColor: colors.primaryFill }]} /> : <Icon size={14} color={colors.textMuted} strokeWidth={ICON_STROKE + 0.25} />}
              <Text variant="footnote" weight="medium" numberOfLines={1} style={{ color: colors.text, flexShrink: 1 }}>
                {pillText(key, c.count, label)}
              </Text>
            </PressableScale>
          ))}
        </View>
      ) : headline ? (
        <Text variant="callout" style={{ color: colors.textMuted }} numberOfLines={2}>
          {headline}
        </Text>
      ) : null}
    </View>
  );
}

/** Pure: only the counters with something in them — a row of zero tiles says nothing. */
export function liveCounters<T extends { key: string; count: number }>(keys: string[], counters: T[] | null): T[] {
  return keys.map((k) => counters?.find((c) => c.key === k)).filter((c): c is T => c != null && c.count > 0);
}


const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  hello: { marginTop: space.md, gap: 2 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, height: 34, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, maxWidth: "100%" },
  urgent: { width: 7, height: 7, borderRadius: 4 },
});
