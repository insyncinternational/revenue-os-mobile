import { useEffect, useState } from "react";
import { I18nManager, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, useReducedMotion } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, shadows, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { Text } from "./Text";

/** `size="sm"`: a compact switch that fits beside a section title. */
type Props<K extends string> = { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; size?: "md" | "sm" };

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Equal-width segments with a sliding thumb (runs on the UI thread). */
export function SegmentedControl<K extends string>({ options, value, onChange, size = "md" }: Props<K>) {
  const small = size === "sm";
  const { colors, scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - 4) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    // Right-to-left (Arabic): the thumb starts at the right edge and slides left.
    const to = index * segment * (I18nManager.isRTL ? -1 : 1);
    x.value = reduceMotion ? to : withTiming(to, { duration: motion.base, easing: EASE });
  }, [index, segment, reduceMotion, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, small && styles.trackSmall, { backgroundColor: colors.surfaceTertiary }]}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width: segment, backgroundColor: scheme === "dark" ? colors.surfaceTertiary : colors.surface, borderColor: scheme === "dark" ? colors.borderStrong : "transparent" },
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            // The track is 36 px; each segment answers 4 px above and below too (44 px to tap).
            hitSlop={small ? { top: 6, bottom: 6 } : { top: 4, bottom: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(o.key);
              }
            }}
            style={styles.segment}
          >
            <Text variant={small ? "footnote" : "subhead"} weight={selected ? "semibold" : "medium"} tone={selected ? "default" : "muted"} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", height: 36, borderRadius: radius.md, padding: 2 },
  trackSmall: { height: 32, width: 216 },
  thumb: { position: "absolute", top: 2, bottom: 2, left: 2, borderRadius: radius.md - 2, borderWidth: 1, shadowColor: shadows.neutral, shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xs },
});
