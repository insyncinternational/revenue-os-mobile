import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import type { Deal, Stage } from "@/types/pipeline";
import { Check, ICON_STROKE } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { orderedStages } from "./pipeline";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const DOT = 18;
/** Stage names under the dots only fit up to this many open stages; beyond it, the current one is named below. */
const LABEL_LIMIT = 5;

/**
 * Where the deal is, as a stepper: one dot per open stage joined by a line that fills up to the current stage (in
 * its colour), done stages ticked, the current one pulsing. All green when won.
 */
export function StageStrip({ stages, deal }: { stages: Stage[]; deal: Pick<Deal, "stage_id" | "status"> }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const open = orderedStages(stages).filter((s) => !s.is_won && !s.is_lost);
  const won = deal.status === "won";
  const at = won ? open.length - 1 : open.findIndex((s) => s.id === deal.stage_id);
  const current = stages.find((s) => s.id === deal.stage_id);
  const accent = won ? colors.success : (current?.color ?? colors.primary);
  const share = open.length > 1 && at >= 0 ? at / (open.length - 1) : 0;

  const fill = useSharedValue(reduce ? share : 0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    fill.set(reduce ? share : withDelay(250, withTiming(share, { duration: 800, easing: EASE })));
    if (!reduce && deal.status === "open") pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [share, reduce, deal.status, fill, pulse]);
  const line = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const ring = useAnimatedStyle(() => ({ opacity: (1 - pulse.value) * 0.55, transform: [{ scale: 1 + pulse.value * 0.9 }] }));

  const labels = open.length <= LABEL_LIMIT;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={current?.name}>
      <View style={styles.track}>
        <View style={[styles.lineBase, { left: `${50 / Math.max(open.length, 1)}%`, right: `${50 / Math.max(open.length, 1)}%`, backgroundColor: colors.surfaceTertiary }]}>
          <Animated.View style={[styles.lineFill, { backgroundColor: accent }, line]} />
        </View>
        <View style={styles.dots}>
          {open.map((s, i) => {
            const done = won || (deal.status === "open" && i < at);
            const isNow = !won && deal.status === "open" && i === at;
            return (
              <View key={s.id} style={styles.dotCell}>
                {isNow ? <Animated.View style={[styles.pulse, { backgroundColor: accent }, ring]} /> : null}
                <View
                  style={[
                    styles.dot,
                    done || isNow ? { backgroundColor: accent, borderColor: accent } : { backgroundColor: colors.surface, borderColor: colors.borderStrong },
                    isNow && styles.dotNow,
                  ]}
                >
                  {done ? <Check size={11} color={colors.onPrimary} strokeWidth={ICON_STROKE + 1} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {labels ? (
        <View style={styles.dots}>
          {open.map((s, i) => (
            <Text key={s.id} variant="caption" align="center" numberOfLines={1} tone={i === at && !won ? "default" : "muted"} weight={i === at && !won ? "semibold" : undefined} style={styles.label}>
              {s.name}
            </Text>
          ))}
        </View>
      ) : null}
      {!labels || won || deal.status === "lost" ? (
        <Text variant="footnote" weight="semibold" tone={won ? "success" : deal.status === "lost" ? "danger" : "secondary"} numberOfLines={1}>
          {current?.name ?? ""}
          {deal.status === "open" && at >= 0 ? `  ·  ${at + 1}/${open.length}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, alignSelf: "stretch" },
  track: { height: DOT + 8, justifyContent: "center" },
  // The line runs between the first and last dot centres (set inline from the stage count).
  lineBase: { position: "absolute", height: 4, borderRadius: 2, overflow: "hidden" },
  lineFill: { height: 4, borderRadius: 2 },
  dots: { flexDirection: "row" },
  dotCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dotNow: { width: DOT + 4, height: DOT + 4, borderRadius: (DOT + 4) / 2 },
  pulse: { position: "absolute", width: DOT + 4, height: DOT + 4, borderRadius: (DOT + 4) / 2 },
  label: { flex: 1, paddingHorizontal: 2 },
});
