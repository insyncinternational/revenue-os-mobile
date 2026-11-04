import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { openApproval, openApprovals } from "@/lib/navigate";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { accentGradient, Sheen } from "@/ui/Gloss";
import { ICON_STROKE, Sparkles } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { confidencePercent } from "./approvals";
import { useApprovalCount, useDrafts, useDraftsVisible } from "./useApprovals";

/**
 * "AI drafted a reply · Michael Ziegler · 82% sure": a glossy accent card with a white Review button, shown while
 * drafts or actions wait for an OK. One draft opens straight into it; more open the approvals list.
 */
export function AiReviewCard() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const count = useApprovalCount();
  const drafts = useDrafts(useDraftsVisible()).data ?? [];
  if (count <= 0) return null;
  const first = drafts[0];
  const who = first?.lead ? [first.lead.first_name, first.lead.last_name].filter(Boolean).join(" ") || first.lead.company || null : null;
  const sure = first ? confidencePercent(first) : null;
  const title = drafts.length > 1 ? t("approvals.draftedMany", { count: drafts.length }) : first ? t("approvals.draftedOne") : t("approvals.drafts");
  const subtitle = drafts.length === 1 && (who || sure != null) ? [who, sure != null ? t("approvals.confidence", { n: sure }) : null].filter(Boolean).join(" · ") : t("approvals.waiting", { count });
  const open = () => (drafts.length === 1 && count === 1 ? openApproval(first!.id) : openApprovals());
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(320)} style={[styles.card, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}>
      <Sheen />
      <Sparkles size={20} color={colors.onPrimary} strokeWidth={ICON_STROKE} />
      <View style={styles.body}>
        <Text variant="headline" style={{ color: colors.onPrimary }} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="footnote" style={{ color: colors.onPrimaryMuted }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <PressableScale
        onPress={() => {
          haptics.selection();
          open();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t("approvals.review")}: ${title}`}
        scaleTo={0.95}
        style={[styles.button, { backgroundColor: colors.onPrimary }]}
      >
        <Text variant="callout" weight="semibold" style={{ color: colors.primaryFill }}>
          {t("approvals.review")}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, borderRadius: radius.xl + 4, padding: space.md, paddingStart: space.lg + 2, flexDirection: "row", alignItems: "center", gap: space.md, overflow: "hidden" },
  body: { flex: 1, minWidth: 0, gap: 1 },
  button: { height: 44, paddingHorizontal: space.lg + 2, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
