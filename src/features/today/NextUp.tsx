import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { appLinkFor } from "@/lib/links";
import { go, openWebHref } from "@/lib/navigate";
import { useTheme } from "@/theme/ThemeProvider";
import { onSolid, onWhite as INK, radius, space } from "@/theme/tokens";
import type { AiRecommendation, PlanAction, PlanItem } from "@/types/home";
import { ICON_STROKE, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { actionFor, primaryAction } from "./UpNext";

type Props = { item?: PlanItem; suggestion?: AiRecommendation; onComplete: (taskId: number, itemId: string) => void };

/**
 * The one thing to do first, as Today's hero: the only gradient on the screen (the brand colour, an agency's if
 * set), so the eye lands here. A plan item when there is one, else the top suggestion; one white action button.
 */
export function NextUp({ item, suggestion, onComplete }: Props) {
  const { colors } = useTheme();
  const content = item ? fromItem(item, onComplete) : suggestion ? fromSuggestion(suggestion) : null;
  if (!content) return null;
  const { title, subtitle, action } = content;
  const Icon = action?.icon;
  return (
    <View style={[styles.card, { backgroundColor: colors.primaryFill, backgroundImage: `linear-gradient(135deg, ${colors.primaryFill}, ${colors.heroGlow})` }]}>
      <View style={[styles.glowA, { backgroundColor: GLASS }]} />
      <View style={[styles.glowB, { backgroundColor: GLASS }]} />
      <View style={[styles.label, { backgroundColor: GLASS }]}>
        <Text variant="caption" weight="semibold" style={{ color: onSolid }}>
          {t("today.upNext")}
        </Text>
      </View>
      <Text variant="title" style={styles.title} numberOfLines={3}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <PressableScale
          onPress={() => {
            haptics.light();
            action.run();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          scaleTo={0.96}
          style={styles.button}
        >
          {Icon ? <Icon size={17} color={INK} strokeWidth={ICON_STROKE + 0.5} /> : null}
          <Text variant="callout" weight="semibold" style={{ color: INK }} numberOfLines={1}>
            {action.label}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

type Content = { title: string; subtitle: string | null; action: { label: string; icon?: IconComponent; run: () => void } | null };

function fromItem(item: PlanItem, onComplete: Props["onComplete"]): Content {
  const main = primaryAction(item);
  const open = item.actions.find((a): a is Extract<PlanAction, { kind: "open" }> => a.kind === "open");
  // No action of its own but a screen to open: the button opens it.
  const action = main ? actionFor(main, item.id, onComplete, item.kind === "reply") : null;
  const fallback = !action && open && appLinkFor(open.href) ? { label: t("today.open"), run: () => openWebHref(open.href) } : null;
  return { title: item.title, subtitle: item.subtitle ?? item.reason, action: action ?? fallback };
}

function fromSuggestion(r: AiRecommendation): Content {
  const target = appLinkFor(r.href);
  return { title: r.text, subtitle: null, action: target ? { label: r.action, run: () => go(target) } : null };
}

const GLASS = "rgba(255, 255, 255, 0.16)";

const styles = StyleSheet.create({
  card: { borderRadius: radius.xxl, padding: space.xl, gap: space.sm + 2, overflow: "hidden" },
  glowA: { position: "absolute", right: -48, top: -56, width: 180, height: 180, borderRadius: 90, opacity: 0.7 },
  glowB: { position: "absolute", right: 36, bottom: -80, width: 130, height: 130, borderRadius: 65, opacity: 0.5 },
  label: { alignSelf: "flex-start", paddingHorizontal: space.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  title: { color: onSolid, fontSize: 21, lineHeight: 27, letterSpacing: -0.3, maxWidth: 300 },
  subtitle: { color: "rgba(255, 255, 255, 0.82)" },
  button: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: space.sm, height: 46, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: onSolid, marginTop: space.xs },
});
