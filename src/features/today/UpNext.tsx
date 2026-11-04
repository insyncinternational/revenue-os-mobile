import { useEffect } from "react";
import { Linking, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { t } from "@/i18n";
import { openApprovals, openWebHref } from "@/lib/navigate";
import { appLinkFor } from "@/lib/links";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import type { PlanAction, PlanItem } from "@/types/home";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Calendar, CheckCircle2, ChevronRight, CircleAlert, Clock, Flame, ICON_STROKE, KanbanSquare, MessageCircle, Phone, Sparkles, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Divider } from "@/ui/Section";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { Text } from "@/ui/Text";

/** Each kind's icon on a soft tinted circle: the row's action pill is its only strong colour, so rows stay calm. */
const KIND: Record<PlanItem["kind"], { icon: IconComponent; tone: { bg: keyof Palette; fg: keyof Palette } }> = {
  approval: { icon: Sparkles, tone: { bg: "primarySubtle", fg: "primary" } },
  reply: { icon: MessageCircle, tone: { bg: "surfaceTertiary", fg: "text" } },
  meeting: { icon: Calendar, tone: { bg: "surfaceTertiary", fg: "text" } },
  call: { icon: Phone, tone: { bg: "surfaceTertiary", fg: "text" } },
  follow_up: { icon: Clock, tone: { bg: "surfaceTertiary", fg: "text" } },
  hot_lead: { icon: Flame, tone: { bg: "primarySubtle", fg: "primary" } },
  stalled_deal: { icon: KanbanSquare, tone: { bg: "surfaceTertiary", fg: "text" } },
  attention: { icon: CircleAlert, tone: { bg: "surfaceTertiary", fg: "text" } },
};

/** The one action the app can do for an item, best first: review an approval, call, complete, open. AI briefs come later. */
export function primaryAction(item: PlanItem): PlanAction | null {
  const usable = item.actions.filter((a) => a.kind === "approve" || a.kind === "call" || a.kind === "complete_task" || (a.kind === "open" && appLinkFor(a.href)));
  // Someone wrote back: answer in the conversation, not by phone.
  if (item.kind === "reply") return usable.find((a) => a.kind === "open") ?? usable[0] ?? null;
  return usable.find((a) => a.kind === "approve") ?? usable.find((a) => a.kind === "call") ?? usable.find((a) => a.kind === "complete_task") ?? usable[0] ?? null;
}

type Props = { items: PlanItem[]; onComplete: (taskId: number, itemId: string) => void; max?: number };

export function UpNext({ items, onComplete, max = 5 }: Props) {
  const { colors } = useTheme();

  if (items.length === 0) return <CaughtUp />;

  return (
    <Card elevated padded={false}>
      {items.slice(0, max).map((item, i) => {
        const kind = KIND[item.kind] ?? KIND.attention;
        const Icon = kind.icon;
        const action = primaryAction(item);
        const openHref = item.actions.find((a): a is Extract<PlanAction, { kind: "open" }> => a.kind === "open");
        const target = openHref ? appLinkFor(openHref.href) : null;
        return (
          <View key={item.id}>
            {i > 0 ? <Divider inset={space.lg + 40 + space.md} /> : null}
            {/* Two separate tap targets side by side (never a button inside a button): the item, then its action. */}
            <View style={styles.row}>
              <PressableScale
                disabled={!target}
                onPress={() => target && openWebHref(openHref!.href)}
                accessibilityRole={target ? "button" : "text"}
                accessibilityLabel={`${item.title}. ${item.reason}`}
                scaleTo={0.99}
                style={styles.main}
              >
                <View style={[styles.disc, { backgroundColor: colors[kind.tone.bg] }]}>
                  <Icon size={19} color={colors[kind.tone.fg]} strokeWidth={ICON_STROKE + 0.25} />
                </View>
                <View style={styles.flex}>
                  <Text variant="callout" weight="semibold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {/* One quiet line: what it's about, else why it's here. */}
                  <Text variant="footnote" tone="muted" numberOfLines={1}>
                    {item.subtitle ?? item.reason}
                  </Text>
                </View>
              </PressableScale>
              {action ? (
                <ActionButton action={action} itemId={item.id} onComplete={onComplete} isReply={item.kind === "reply"} />
              ) : target ? (
                <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** Nothing waiting: a small moment of reward — a soft green wash, the tick springs in with two ripples, sparkles drift. */
function CaughtUp() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  const ripple = useSharedValue(0);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    pop.set(withDelay(150, withSpring(1, { damping: 8, stiffness: 160 })));
    ripple.set(withDelay(300, withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), 2, false)));
    drift.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, pop, ripple, drift]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const ring = useAnimatedStyle(() => ({ opacity: (1 - ripple.value) * 0.5, transform: [{ scale: 1 + ripple.value * 0.9 }] }));
  const sparkA = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: -drift.value * 4 }, { rotate: `${drift.value * 18}deg` }] }));
  const sparkB = useAnimatedStyle(() => ({ opacity: pop.value * 0.8, transform: [{ translateY: drift.value * 3 }, { rotate: `${-drift.value * 14}deg` }] }));
  return (
    // The hero slot when nothing is due: the same glossy accent card as "Up next", saying all is clear.
    <View style={[styles.caughtCard, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}>
      <Sheen />
      <View style={styles.clear}>
        <View style={styles.tickWrap}>
          <Animated.View style={[styles.ripple, { borderColor: colors.onPrimary }, ring]} />
          <Animated.View style={[styles.icon, { backgroundColor: colors.primaryTrack }, tick]}>
            <CheckCircle2 size={22} color={colors.onPrimary} strokeWidth={ICON_STROKE + 0.25} />
          </Animated.View>
          <Animated.View style={[styles.sparkA, sparkA]}>
            <Sparkles size={12} color={colors.onPrimary} strokeWidth={ICON_STROKE} />
          </Animated.View>
          <Animated.View style={[styles.sparkB, sparkB]}>
            <Sparkles size={10} color={colors.onPrimaryMuted} strokeWidth={ICON_STROKE} />
          </Animated.View>
        </View>
        <View style={styles.flex}>
          <Text variant="title" style={{ color: colors.onPrimary }}>{t("today.allClear")}</Text>
          <Text variant="subhead" style={{ color: colors.onPrimaryMuted }}>
            {t("today.allClearMessage")}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** What an item's main action is called, its icon, and what it does — shared by the rows and the Next up card. */
export function actionFor(action: PlanAction, itemId: string, onComplete: Props["onComplete"], isReply?: boolean): { label: string; icon?: IconComponent; ghost?: boolean; run: () => void } | null {
  switch (action.kind) {
    // Read what the AI wants to do before saying yes — never approved blind from a list.
    case "approve":
      return { label: t("approvals.review"), icon: Sparkles, run: openApprovals };
    case "call":
      return { label: t("today.call"), icon: Phone, run: () => void Linking.openURL(`tel:${action.phone.replace(/[^\d+]/g, "")}`) };
    case "complete_task":
      return { label: t("today.done"), icon: CheckCircle2, run: () => onComplete(action.task_id, itemId) };
    case "open": {
      if (!appLinkFor(action.href)) return null;
      // A reply opens straight into its conversation.
      return isReply
        ? { label: t("today.reply"), icon: MessageCircle, run: () => openWebHref(action.href) }
        : { label: t("today.open"), ghost: true, run: () => openWebHref(action.href) };
    }
    default:
      return null;
  }
}

function ActionButton({ action, itemId, onComplete, isReply }: { action: PlanAction; itemId: string; onComplete: Props["onComplete"]; isReply?: boolean }) {
  const a = actionFor(action, itemId, onComplete, isReply);
  if (!a) return null;
  return <Button label={a.label} size="sm" variant={a.ghost ? "ghost" : "primary"} style={styles.pill} onPress={a.run} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  disc: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  // Filled, fully rounded, text only: the one strong thing on the row.
  pill: { borderRadius: radius.pill, paddingHorizontal: space.md + 2 },
  clear: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  caughtCard: { overflow: "hidden", borderRadius: radius.xxl, paddingVertical: space.md },
  tickWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  ripple: { position: "absolute", width: 40, height: 40, borderRadius: radius.md, borderWidth: 2 },
  sparkA: { position: "absolute", top: -8, right: -8 },
  sparkB: { position: "absolute", bottom: -6, left: -8 },
});
