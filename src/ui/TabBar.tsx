import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, space } from "@/theme/tokens";
import { accentGradient } from "./Gloss";
import { Text } from "./Text";

const PILL_W = 56;
const PILL_H = 32;

/**
 * The bottom bar on every platform: fixed, full width, white (a lifted grey in dark mode) with a hairline on top.
 * Every tab shows its icon and name; the selected one sits on an accent pill that springs open from the middle.
 * Sits in the layout (not over it), so it never covers a list's last row.
 */
export function TabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, space.sm) }]}
    >
      {state.routes.map((route, i) => {
        const options = descriptors[route.key]!.options;
        const focused = state.index === i;
        const label = typeof options.title === "string" ? options.title : route.name;
        const badge = options.tabBarBadge;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge != null ? `${label}, ${badge}` : label}
            onPress={() => {
              if (!focused) haptics.selection();
              navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <View style={styles.iconBox}>
              <Pill focused={focused} color={colors.primaryFill} />
              {options.tabBarIcon?.({ focused, color: focused ? colors.onPrimary : colors.textMuted, size: 21 })}
              {badge != null ? (
                <View style={[styles.badge, { backgroundColor: colors.ink, borderColor: colors.surface }]}>
                  <Text variant="caption" numeric style={{ color: colors.onInk, fontSize: 10, lineHeight: 13 }} maxFontSizeMultiplier={1}>
                    {String(badge)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{ fontSize: 11, color: focused ? colors.text : colors.textMuted, fontFamily: focused ? fonts.semibold : fonts.medium }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The selected tab's accent pill: grows out from the middle when the tab is chosen. */
function Pill({ focused, color }: { focused: boolean; color: string }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const open = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    if (reduce) open.set(focused ? 1 : 0);
    else open.set(focused ? withSpring(1, { damping: 16, stiffness: 260, mass: 0.6 }) : withTiming(0, { duration: 120 }));
  }, [focused, reduce, open]);
  const style = useAnimatedStyle(() => ({ opacity: open.get(), transform: [{ scaleX: 0.4 + 0.6 * open.get() }] }));
  return <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: color, backgroundImage: accentGradient(colors) }, style]} />;
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, paddingHorizontal: space.xs },
  item: { flex: 1, alignItems: "center", gap: space.xs, minHeight: 52 },
  iconBox: { width: PILL_W, height: PILL_H, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", left: 0, top: 0, width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2 },
  badge: { position: "absolute", top: -3, right: 6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
