import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { gutter, radius, space } from "@/theme/tokens";
import { QUICK_ACTION_SIZE } from "./QuickActions";
import { useTheme } from "@/theme/ThemeProvider";
import { Skeleton } from "@/ui/Skeleton";

/** First-ever load only (cached data shows instantly otherwise): Today's real layout with placeholder shapes. */
export function TodaySkeleton() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar">
      <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
        <View style={styles.bar}>
          <Skeleton width={40} height={40} round />
          <Skeleton width={150} height={16} />
        </View>
        <View style={styles.hello}>
          <Skeleton width={130} height={14} />
          <Skeleton width={160} height={46} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={[styles.grid, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.cellBody}>
              <Skeleton width={QUICK_ACTION_SIZE} height={QUICK_ACTION_SIZE} round />
              <Skeleton width={54} height={10} />
            </View>
          ))}
        </View>
        <View style={styles.feature}>
          <Skeleton width="100%" height={200} />
        </View>
        <Skeleton width={90} height={20} />
        <View style={[styles.feature, { backgroundColor: colors.surface }]}>
          <Skeleton width="100%" height={190} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  bar: { flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  hello: { marginTop: space.md, gap: space.sm },
  body: { paddingHorizontal: gutter, gap: space.md },
  feature: { borderRadius: radius.xxl, overflow: "hidden" },
  grid: { flexDirection: "row", justifyContent: "space-around", paddingVertical: space.lg, borderRadius: radius.xl + 4 },
  cellBody: { gap: space.sm, alignItems: "center" },
});
