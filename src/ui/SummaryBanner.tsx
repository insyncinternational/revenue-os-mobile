import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import { AnimatedNumber } from "./AnimatedNumber";
import { GradientFill } from "./Gradient";
import { ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type SummaryStat = {
  key: string;
  label: string;
  value: number;
  icon: IconComponent;
  tone: { bg: keyof Palette; fg: keyof Palette };
  /** Tapping a stat applies it as the list's filter (e.g. Unread). */
  onPress?: () => void;
  selected?: boolean;
};

/**
 * The top of a tab screen: a soft brand wash fading into the page, the workspace pill (or other controls) and live
 * stat tiles that count up — so every tab opens on "where things stand", not on a bare list.
 */
export function SummaryBanner({ top, stats, children }: { top?: ReactNode; stats?: SummaryStat[]; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <GradientFill from={colors.primarySubtle} to={colors.background} vertical />
      {top ? <View style={styles.top}>{top}</View> : null}
      {stats?.length ? (
        <View style={styles.stats}>
          {stats.map((s) => (
            <StatTile key={s.key} stat={s} />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function StatTile({ stat: s }: { stat: SummaryStat }) {
  const { colors } = useTheme();
  const Icon = s.icon;
  const body = (
    <>
      <View style={[styles.icon, { backgroundColor: colors[s.tone.bg] }]}>
        <Icon size={15} color={colors[s.tone.fg]} strokeWidth={ICON_STROKE + 0.25} />
      </View>
      <AnimatedNumber value={s.value} variant="headline" tone={s.value === 0 ? "subtle" : "default"} />
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {s.label}
      </Text>
    </>
  );
  const style = [styles.tile, { backgroundColor: colors.surface, borderColor: s.selected ? colors.primary : colors.border, boxShadow: colors.cardShadow }];
  return s.onPress ? (
    <PressableScale onPress={s.onPress} accessibilityRole="button" accessibilityState={{ selected: !!s.selected }} accessibilityLabel={`${s.label}: ${s.value}`} scaleTo={0.96} style={style}>
      {body}
    </PressableScale>
  ) : (
    <View style={style} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter, paddingTop: space.xs, paddingBottom: space.xs, gap: space.md, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stats: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: 4 },
  icon: { width: 28, height: 28, borderRadius: radius.md - 2, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
