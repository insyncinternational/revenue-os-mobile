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
import { HeaderActions, WorkspaceButton } from "@/ui/HeroTopBar";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/**
 * The three counters worth a glance first thing; the rest live in "Up next". The app's own labels, which say
 * these are today's to-dos, so they never read as the period totals in Performance ("Positive replies",
 * "Meetings booked") further down.
 */
const HERO_COUNTERS: { key: string; icon: IconComponent; label: TranslationKey }[] = [
  { key: "replies", icon: MessageCircle, label: "today.counter.replies" },
  { key: "calls_due", icon: Phone, label: "today.counter.calls" },
  { key: "meetings", icon: Calendar, label: "today.counter.meetings" },
];

type Props = { counters: MyDayCounter[] | null; headline: string | null; onCounter?: (key: string) => void };

/**
 * Today's header, on the page background: greeting (the first name in the brand colour), the day in one sentence
 * (or the date when nothing is due), and today's counters as tiles — only the ones above zero. Colour is kept to accents on purpose, so the
 * screen stays calm and the few coloured things stand out.
 */
export function Hero({ counters, headline, onCounter }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const chip = useHeaderChip();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";
  const greeting = t(greetingKey(new Date().getHours()));
  const live = liveCounters(HERO_COUNTERS.map((h) => h.key), counters);
  const shown = HERO_COUNTERS.flatMap((h) => {
    const c = live.find((x) => x.key === h.key);
    return c ? [{ ...h, c }] : [];
  });

  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
      {/* The greeting with the workspace under it, the bell and the person beside it. */}
      <View style={styles.topRow}>
        <View style={styles.hello}>
          <Text variant="largeTitle" style={[styles.greeting, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </Text>
          <WorkspaceButton plain />
        </View>
        <HeaderActions />
      </View>
      {/* What needs you, in one line; nothing when all is clear (the cards below say so). */}
      {headline ? (
        <Text variant="body" style={{ color: colors.textMuted }} numberOfLines={2}>
          {headline}
        </Text>
      ) : null}

      {shown.length > 0 ? (
        <View style={styles.tiles}>
          {shown.map(({ key, icon: Icon, label, c }) => {
            const count = c.count;
            return (
              // A small pill per counter (the Up next card below is the big thing): icon, number, label.
              <PressableScale key={key} onPress={() => onCounter?.(key)} accessibilityLabel={`${t(label)}: ${count}`} style={[styles.tile, chip]}>
                <Icon size={15} color={c.urgent ? colors.warning : colors.textSecondary} strokeWidth={ICON_STROKE + 0.5} />
                <Text variant="subhead" weight="bold" numeric style={{ color: colors.text }}>
                  {count}
                </Text>
                <Text variant="subhead" numberOfLines={1} style={{ color: colors.textMuted, flexShrink: 1 }}>
                  {t(label)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Pure: only the counters with something in them — a row of zero tiles says nothing. */
export function liveCounters<T extends { key: string; count: number }>(keys: string[], counters: T[] | null): T[] {
  return keys.map((k) => counters?.find((c) => c.key === k)).filter((c): c is T => c != null && c.count > 0);
}


const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.sm },
  topRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
  hello: { flex: 1, minWidth: 0, gap: 4 },
  greeting: { fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
  tile: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, height: 36, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, maxWidth: "100%" },
});
