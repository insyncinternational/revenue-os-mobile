import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUICK_ACTION_SIZE } from "@/features/today/QuickActions";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Skeleton } from "@/ui/Skeleton";

/**
 * Agency home while it loads: the real layout (top bar, greeting, shortcuts card, credit pool, client health)
 * in placeholder shapes, starting below the status bar, so the page doesn't jump when the data lands.
 */
export function AgencyHomeSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const card = { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft };
  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top + space.md }]} accessibilityLabel={t("state.loading")} accessibilityRole="progressbar">
      <View style={styles.bar}>
        <Skeleton width={40} height={40} round />
        <Skeleton width={150} height={16} />
        <View style={styles.flex} />
        <Skeleton width={44} height={44} round />
      </View>
      <View style={styles.hello}>
        <Skeleton width={120} height={14} />
        <Skeleton width={150} height={46} />
        <Skeleton width={210} height={13} />
      </View>
      <View style={[styles.quick, card]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.quickItem}>
            <Skeleton width={QUICK_ACTION_SIZE} height={QUICK_ACTION_SIZE} round />
            <Skeleton width={54} height={10} />
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Skeleton width={110} height={18} />
      </View>
      <View style={styles.pool}>
        <Skeleton width="100%" height={150} />
      </View>
      <View style={styles.section}>
        <Skeleton width={120} height={18} />
      </View>
      <View style={[styles.list, card]}>
        <Skeleton width="100%" height={8} />
        {[0, 1].map((i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={40} height={40} round />
            <View style={styles.rowText}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={11} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", gap: space.sm + 2, paddingHorizontal: gutter },
  hello: { gap: space.sm, paddingHorizontal: gutter, marginTop: space.xl },
  quick: { flexDirection: "row", justifyContent: "space-around", marginHorizontal: gutter, marginTop: space.xl, paddingVertical: space.lg, borderRadius: radius.xl + 4 },
  quickItem: { alignItems: "center", gap: space.sm },
  section: { paddingHorizontal: gutter, marginTop: space.xxl, marginBottom: space.md },
  pool: { marginHorizontal: gutter, borderRadius: radius.xxl, overflow: "hidden" },
  list: { marginHorizontal: gutter, padding: space.lg, gap: space.lg, borderRadius: radius.xl + 4 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowText: { flex: 1, gap: space.sm },
});
