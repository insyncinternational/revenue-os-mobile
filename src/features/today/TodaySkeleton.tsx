import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { gutter, radius, space } from "@/theme/tokens";
import { Card } from "@/ui/Card";
import { Skeleton } from "@/ui/Skeleton";

/** First-ever load only (cached data shows instantly otherwise): Today's real layout with placeholder shapes. */
export function TodaySkeleton() {
  const insets = useSafeAreaInsets();
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
        <View style={styles.pills}>
          <Skeleton width={110} height={34} />
          <Skeleton width={140} height={34} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.feature}>
          <Skeleton width="100%" height={200} />
        </View>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} style={styles.cell} contentStyle={styles.cellBody}>
              <Skeleton width={44} height={44} round />
              <Skeleton width="70%" height={12} />
            </Card>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  bar: { flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  hello: { marginTop: space.md, gap: space.sm },
  pills: { flexDirection: "row", gap: space.sm },
  body: { paddingHorizontal: gutter, gap: space.md },
  feature: { borderRadius: radius.xxl, overflow: "hidden" },
  grid: { flexDirection: "row", gap: space.sm },
  cell: { flex: 1 },
  cellBody: { gap: space.sm, alignItems: "center" },
});
