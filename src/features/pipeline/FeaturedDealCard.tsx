import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { initials } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Deal } from "@/types/pipeline";
import { Sheen } from "@/ui/Gloss";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

type Props = { deal: Deal; locale: string; showMoney: boolean; onPress: (d: Deal) => void; fallbackCurrency: string };

/**
 * The first deal of the stage as a feature card (the Mono mock): glossy deep brand, the amount large in a light
 * tint of the brand, how likely it is to close as four segments, and the owner's initials top right.
 */
export const FeaturedDealCard = memo(function FeaturedDealCard({ deal, locale, showMoney, onPress, fallbackCurrency }: Props) {
  const { colors } = useTheme();
  const currency = deal.currency ?? fallbackCurrency;
  const who = [[deal.lead?.first_name, deal.lead?.last_name].filter(Boolean).join(" ") || null, deal.account?.name ?? deal.lead?.company ?? null].filter(Boolean).join(" · ");
  const p = deal.probability != null ? Math.max(0, Math.min(100, Math.round(deal.probability))) : null;
  const filled = p != null ? Math.round(p / 25) : 0;
  const amount = deal.amount != null ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(deal.amount) : null;
  return (
    <PressableScale
      onPress={() => onPress(deal)}
      accessibilityRole="button"
      accessibilityLabel={[deal.name, who, showMoney && amount ? `${currency} ${amount}` : null, p != null ? `${p}%` : null].filter(Boolean).join(". ")}
      scaleTo={0.985}
      style={[styles.card, { backgroundColor: colors.contrast, backgroundImage: `linear-gradient(150deg, ${colors.heroFrom} 0%, ${colors.contrast} 65%)` }]}
    >
      <Sheen strength={0.6} />
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={2} style={{ color: colors.onContrast, fontSize: 17 }}>
            {deal.name}
          </Text>
          {who ? (
            <Text variant="footnote" numberOfLines={1} style={{ color: colors.onContrastMuted }}>
              {who}
            </Text>
          ) : null}
        </View>
        {deal.owner ? (
          <View style={[styles.owner, { backgroundColor: colors.contrastTrack }]}>
            <Text variant="caption" weight="semibold" style={{ color: colors.heroGlow, fontSize: 11 }}>
              {initials(deal.owner.name || deal.owner.email)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bottom}>
        {showMoney && amount ? (
          <Text variant="metric" numeric numberOfLines={1} style={[styles.amount, { color: colors.heroGlow }]}>
            {amount}
            <Text variant="footnote" weight="medium" style={{ color: colors.onContrastMuted }}>{` ${currency}`}</Text>
          </Text>
        ) : (
          <View />
        )}
        {p != null ? (
          <Text variant="eyebrow" numeric style={{ color: colors.onContrastMuted }}>
            {t("pipeline.likelyPct", { n: p })}
          </Text>
        ) : null}
      </View>
      {p != null ? (
        <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.segment, { backgroundColor: i < filled ? colors.heroGlow : colors.contrastTrack }]} />
          ))}
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, marginBottom: space.sm + 2, borderRadius: radius.xl + 4, padding: space.xl, paddingVertical: space.lg + 2, gap: space.md, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  owner: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md },
  amount: { fontSize: 30, lineHeight: 34, letterSpacing: -1 },
  segments: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
});
