import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, useReducedMotion } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, shadows, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { Text } from "./Text";

type Props<K extends string> = { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void };

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Equal-width segments with a sliding thumb (runs on the UI thread). */
export function SegmentedControl<K extends string>({ options, value, onChange }: Props<K>) {
  const { colors, scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - 4) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = reduceMotion ? index * segment : withTiming(index * segment, { duration: motion.base, easing: EASE });
  }, [index, segment, reduceMotion, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceTertiary }]}
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
            <Text variant="subhead" weight={selected ? "semibold" : "medium"} tone={selected ? "default" : "muted"} numberOfLines={1}>
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
  thumb: { position: "absolute", top: 2, bottom: 2, left: 2, borderRadius: radius.md - 2, borderWidth: 1, shadowColor: shadows.neutral, shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xs },
});
