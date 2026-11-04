import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * A lead's score or a deal's probability (0–100) as ten small segments with the percentage (Mono look: ink
 * segments, the one it ends in filled part-way). Plain views (no SVG), so long lists stay cheap.
 */
export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.score} accessible accessibilityLabel={`${label ? `${label} ` : ""}${v}%`}>
      <Segments value={v} on={colors.primaryFill} off={colors.surfaceTertiary} />
      <Text variant="eyebrow" numeric style={{ color: colors.textSecondary, letterSpacing: 0.3 }}>
        {`${v}%`}
      </Text>
    </View>
  );
}

/** Ten segments filled to `value` (0–100); the segment it ends in is filled part-way. */
export function Segments({ value, on, off, height = 6 }: { value: number; on: string; off: string; height?: number }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value / 10 - i));
        return (
          <View key={i} style={[styles.segment, { height, backgroundColor: off }]}>
            {fill > 0 ? <View style={{ width: `${fill * 100}%`, height, backgroundColor: on }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * One bar split by share (pipeline value per stage), each part in its own colour; tiny parts keep a sliver.
 * `track`: the colour between the parts (on a ContrastBlock, `contrastTrack`).
 */
export function StageBar({ parts, track }: { parts: { key: string; share: number; color: string }[]; track?: string }) {
  const { colors } = useTheme();
  const shown = parts.filter((p) => p.share > 0);
  return (
    <View style={[styles.stages, { backgroundColor: track ?? colors.surfaceTertiary }]}>
      {shown.map((p) => (
        <View key={p.key} style={{ flexGrow: Math.max(p.share, 0.03), backgroundColor: p.color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  score: { flexDirection: "row", alignItems: "center", gap: space.sm + 2 },
  segments: { flex: 1, flexDirection: "row", gap: 3 },
  segment: { flex: 1, borderRadius: 3, overflow: "hidden" },
  stages: { flexDirection: "row", height: 10, borderRadius: radius.pill, overflow: "hidden", gap: 2 },
});
