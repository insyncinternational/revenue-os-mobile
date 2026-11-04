import { StyleSheet, View } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { Check, ICON_STROKE, type IconComponent } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type ChoiceTone = "success" | "warning" | "danger" | "info" | "brand" | "neutral";

const TONES: Record<ChoiceTone, { bg: keyof Palette; fg: keyof Palette }> = {
  success: { bg: "successSurface", fg: "success" },
  warning: { bg: "warningSurface", fg: "warning" },
  danger: { bg: "dangerSurface", fg: "danger" },
  info: { bg: "infoSurface", fg: "info" },
  brand: { bg: "primarySubtle", fg: "primary" },
  neutral: { bg: "surfaceTertiary", fg: "textSecondary" },
};

export type Choice<K extends string> = { key: K; label: string; icon: IconComponent; tone: ChoiceTone };

/**
 * One choice from a few, as big tiles two to a row (how a meeting or a call went): each with its icon on its own
 * tint; the chosen one takes its colour all over, with a tick. Easier to hit and to read than a row of chips.
 */
export function ChoiceTiles<K extends string>({ choices, value, onChange }: { choices: Choice<K>[]; value: K | null; onChange: (key: K) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {choices.map((c) => {
        const on = c.key === value;
        const tone = TONES[c.tone];
        return (
          <PressableScale
            key={c.key}
            onPress={() => {
              if (!on) haptics.selection();
              onChange(c.key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c.label}
            scaleTo={0.96}
            style={[styles.tile, { backgroundColor: on ? colors[tone.bg] : colors.surface, borderColor: on ? colors[tone.fg] : "transparent", boxShadow: on ? undefined : colors.cardShadowSoft }]}
          >
            <View style={styles.top}>
              <View style={[styles.icon, { backgroundColor: on ? colors.surface : colors[tone.bg] }]}>
                <c.icon size={20} color={colors[tone.fg]} strokeWidth={ICON_STROKE + 0.25} />
              </View>
              {on ? <Check size={18} color={colors[tone.fg]} strokeWidth={ICON_STROKE + 0.75} /> : null}
            </View>
            <Text variant="callout" weight="semibold" numberOfLines={2}>
              {c.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm + 2 },
  // Two to a row (the gap comes out of the 50%).
  tile: { width: "48.5%", flexGrow: 1, borderRadius: radius.xl, borderWidth: 1.5, padding: space.md + 2, gap: space.md },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
