import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { orderedStages } from "@/features/pipeline/pipeline";
import { useDeal, useMoveDeal, usePipelineBoard } from "@/features/pipeline/usePipeline";
import { lostReasonLabel } from "@/features/pipeline/labels";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { Stage } from "@/types/pipeline";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Check, ICON_STROKE, Trophy, X, XCircle } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

/** Pick a stage. Won closes it at once; Lost asks why first (the reason shows in reports on the web). */
export default function MoveDeal() {
  const { id: raw, lost } = useLocalSearchParams<{ id: string; lost?: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const { deal } = useDeal(id);
  const { bootstrap, board } = usePipelineBoard();
  const move = useMoveDeal();
  const [picked, setLostStage] = useState<Stage | null>(null);
  const [askReason, setAskReason] = useState(lost === "1");
  const [reason, setReason] = useState<string | null>(null);

  const d = deal.data?.deal;
  const stages = orderedStages(board.data?.stages ?? bootstrap.data?.stages ?? []).filter((s) => !d?.pipeline_id || s.pipeline_id === d.pipeline_id);
  // Opened from "Lost": straight to the reason, using this pipeline's lost stage.
  const lostStage = picked ?? (askReason ? (stages.find((s) => s.is_lost) ?? null) : null);
  const reasons = bootstrap.data?.lost_reasons ?? ["Price", "Competitor", "No Response", "Timeline", "Budget", "Other"];

  const go = (to: Stage, lostReason?: string) => {
    if (!d) return;
    move.mutate({ deal: d, to, lostReason });
    router.back();
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="headline" accessibilityRole="header">
          {lostStage ? t("pipeline.lostReasonTitle") : t("pipeline.moveTitle")}
        </Text>
        <IconButton icon={X} label={t("common.close")} onPress={() => router.back()} />
      </View>
      {lostStage ? (
        <View style={styles.lost}>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {reasons.map((r) => (
              <Chip
                key={r}
                label={lostReasonLabel(r)}
                selected={reason === r}
                onPress={() => {
                  haptics.selection();
                  setReason(r);
                }}
              />
            ))}
          </View>
          <Button label={t("pipeline.confirmLost")} variant="danger" size="lg" fullWidth disabled={!reason} onPress={() => go(lostStage, reason ?? undefined)} />
          <Button
            label={t("common.back")}
            variant="ghost"
            fullWidth
            onPress={() => {
              // Opened straight on "Lost": Back returns to where the user was, not to a list they never saw.
              if (lost === "1") return router.back();
              setLostStage(null);
              setAskReason(false);
            }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {stages.map((s) => {
            const current = s.id === d?.stage_id;
            const Icon = s.is_won ? Trophy : s.is_lost ? XCircle : null;
            return (
              <PressableScale
                key={s.id}
                disabled={current || !d}
                accessibilityRole="radio"
                accessibilityState={{ selected: current }}
                accessibilityLabel={s.name}
                onPress={() => (s.is_lost ? setLostStage(s) : go(s))}
                scaleTo={0.985}
                style={[styles.stage, { backgroundColor: current ? colors.primarySubtle : colors.surface, borderColor: current ? colors.primaryBorder : colors.border }]}
              >
                {Icon ? (
                  <Icon size={18} color={s.is_won ? colors.success : colors.danger} strokeWidth={ICON_STROKE + 0.25} />
                ) : (
                  <View style={[styles.dot, { backgroundColor: s.color ?? colors.primary }]} />
                )}
                <Text variant="callout" weight={current ? "semibold" : "medium"} style={styles.flex} numberOfLines={1}>
                  {s.name}
                </Text>
                {s.probability != null && !s.is_won && !s.is_lost ? (
                  <Text variant="caption" tone="muted" numeric>
                    {s.probability}%
                  </Text>
                ) : null}
                {current ? <Check size={18} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} /> : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: gutter, paddingRight: space.sm, paddingTop: space.md },
  list: { paddingHorizontal: gutter, paddingBottom: space.huge, gap: space.sm },
  stage: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52, paddingHorizontal: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1, minWidth: 0 },
  lost: { paddingHorizontal: gutter, gap: space.md },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm },
});
