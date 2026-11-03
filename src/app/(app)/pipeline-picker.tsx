import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { usePipelineBoard } from "@/features/pipeline/usePipeline";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Check, ICON_STROKE, X } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/**
 * Which pipeline the board shows. A sheet, not a system alert: Android's alert holds three buttons, so a
 * fourth pipeline could never be picked. The choice is remembered (usePipelineBoard).
 */
export default function PipelinePicker() {
  const { colors } = useTheme();
  const { pipelines, choose, pipelineId } = usePipelineBoard();
  const list = pipelines.data?.pipelines ?? [];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="headline" accessibilityRole="header">
          {t("pipeline.switchPipeline")}
        </Text>
        <IconButton icon={X} label={t("common.close")} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.list} accessibilityRole="radiogroup">
        {list.map((p) => {
          const current = p.id === pipelineId;
          return (
            <PressableScale
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: current }}
              accessibilityLabel={p.name}
              onPress={() => {
                haptics.selection();
                if (!current) choose(p.id);
                router.back();
              }}
              scaleTo={0.985}
              style={[styles.row, { backgroundColor: current ? colors.primarySubtle : colors.surface, borderColor: current ? colors.primaryBorder : colors.border }]}
            >
              <Text variant="callout" weight={current ? "semibold" : "medium"} style={styles.flex} numberOfLines={1}>
                {p.name}
              </Text>
              {current ? <Check size={18} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} /> : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: gutter, paddingRight: space.sm, paddingTop: space.md },
  list: { paddingHorizontal: gutter, paddingBottom: space.huge, gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52, paddingHorizontal: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  flex: { flex: 1, minWidth: 0 },
});
