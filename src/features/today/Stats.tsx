import { StyleSheet, View } from "react-native";
import { getIntlLocale } from "@/i18n";
import { count, money } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { KpiMetric } from "@/types/home";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Text } from "@/ui/Text";
import { changeLabel } from "./Kpis";
import { topStats } from "./charts";

/**
 * The period at a glance: up to three numbers that moved, big, each with a short label and its change as a small
 * chip — no zeros (those wait behind "See all").
 */
export function Stats({ metrics, currency }: { metrics: KpiMetric[]; currency: string }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  return (
    <View style={styles.row}>
      {topStats(metrics).map((m) => {
        const change = changeLabel(m);
        const up = change?.trend === "up";
        const down = change?.trend === "down";
        return (
          <View key={m.key} style={[styles.card, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]} accessible accessibilityLabel={[m.label, String(m.value), change?.text].filter(Boolean).join(", ")}>
            <AnimatedNumber
              value={m.value}
              format={(n) => (m.kind === "currency" ? money(n, currency, locale, { compact: true }) : count(n, locale))}
              variant="metric"
              numberOfLines={1}
              adjustsFontSizeToFit
            />
            <Text variant="footnote" tone="muted" weight="medium" numberOfLines={2}>
              {m.label}
            </Text>
            {change ? (
              <View style={[styles.chip, { backgroundColor: up ? colors.successSurface : down ? colors.dangerSurface : colors.surfaceTertiary }]}>
                <Text variant="caption" weight="bold" numeric style={{ color: up ? colors.successText : down ? colors.dangerText : colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
                  {change.text}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm + 2 },
  card: { flex: 1, minWidth: 0, borderRadius: radius.xl, padding: space.md + 2, gap: 2 },
  chip: { alignSelf: "flex-start", marginTop: space.xs + 2, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
});
