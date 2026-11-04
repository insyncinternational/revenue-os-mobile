import { StyleSheet, View } from "react-native";
import { normalizeDecimal } from "@/features/invoices/draft";
import { getIntlLocale, t } from "@/i18n";
import { money } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { Stage } from "@/types/pipeline";
import { Avatar } from "@/ui/Avatar";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";

/**
 * The deal being made, as the pipeline will show it: the name, the amount large,
 * the stage and who it's with. Fills in as the form is typed; placeholders until then.
 */
export function DealPreview({ name, amount, currency, stage, contact }: { name: string; amount: string; currency: string; stage: Stage | null; contact: string | null }) {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const raw = normalizeDecimal(amount);
  const value = raw && Number.isFinite(Number(raw)) ? Number(raw) : null;
  return (
    <Card style={styles.card} contentStyle={styles.body} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.top}>
        <Text variant="headline" numberOfLines={2} tone={name.trim() ? "default" : "subtle"} style={styles.flex}>
          {name.trim() || t("pipeline.new")}
        </Text>
        <Text variant="title" numeric numberOfLines={1} tone={value != null ? "default" : "subtle"}>
          {money(value ?? 0, currency, locale)}
        </Text>
      </View>
      <View style={styles.meta}>
        {stage ? (
          <View style={[styles.stage, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.dot, { backgroundColor: colors.primaryFill }]} />
            <Text variant="caption" weight="semibold" numberOfLines={1}>
              {stage.name}
            </Text>
          </View>
        ) : null}
        {contact ? (
          <View style={styles.who}>
            <Avatar name={contact} size={20} />
            <Text variant="footnote" tone="muted" numberOfLines={1} style={styles.flex}>
              {contact}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.xs },
  body: { paddingLeft: space.lg + 4, gap: space.md },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  flex: { flex: 1, minWidth: 0 },
  meta: { flexDirection: "row", alignItems: "center", gap: space.md },
  stage: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  who: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, flex: 1, minWidth: 0 },
});
