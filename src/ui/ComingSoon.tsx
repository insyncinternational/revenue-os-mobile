import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { gutter, space } from "@/theme/tokens";
import { Card } from "./Card";
import type { IconComponent } from "./icons";
import { Screen } from "./Screen";
import { EmptyState } from "./States";
import { WorkspacePill } from "./WorkspacePill";

/** Placeholder for a tab whose screen lands in a later milestone. Removed as each tab is built. */
export function ComingSoon({ icon, message }: { icon: IconComponent; message: string }) {
  return (
    <Screen>
      <View style={styles.pill}>
        <WorkspacePill />
      </View>
      <Card padded={false} style={styles.card}>
        <EmptyState icon={icon} title={t("soon.title")} message={message} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: gutter, paddingBottom: space.lg },
  card: { marginHorizontal: gutter },
});
