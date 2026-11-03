import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gutter, space } from "@/theme/tokens";
import { Card } from "@/ui/Card";
import { Skeleton, SkeletonRow } from "@/ui/Skeleton";
import { t } from "@/i18n";

/** First-ever load only (cached data shows instantly otherwise): the real header layout with placeholder content. */
export function TodaySkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityLabel={t("state.loading")} accessibilityRole="progressbar">
      <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
        <Skeleton width={150} height={18} />
        <View style={styles.greeting}>
          <Skeleton width={240} height={30} />
        </View>
        <View style={styles.tiles}>
          {[0, 1, 2].map((i) => (
            <Card key={i} style={styles.tile} contentStyle={styles.cellBody}>
              <Skeleton width={28} height={28} />
              <Skeleton width="50%" height={22} />
            </Card>
          ))}
        </View>
      </View>
      <View style={styles.body}>
        <Card elevated padded={false}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </Card>
        <View style={styles.grid}>
          {[0, 1].map((i) => (
            <Card key={i} style={styles.cell} contentStyle={styles.cellBody}>
              <Skeleton width="60%" height={12} />
              <Skeleton width="45%" height={22} />
            </Card>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingBottom: space.lg },
  greeting: { marginTop: space.xl },
  tiles: { flexDirection: "row", gap: space.sm, marginTop: space.xl },
  tile: { flex: 1 },
  body: { paddingHorizontal: gutter, gap: space.lg },
  grid: { flexDirection: "row", gap: space.sm },
  cell: { flex: 1 },
  cellBody: { gap: space.sm },
});
