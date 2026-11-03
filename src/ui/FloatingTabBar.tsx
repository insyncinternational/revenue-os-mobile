import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import Animated, { FadeIn, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, onSolid, onWhite, radius, space, tabBarDark } from "@/theme/tokens";
import { Text } from "./Text";

const PAD = 7;
const BAR_SHADOW = "0px 10px 28px rgba(17, 17, 20, 0.22)";
const ACTIVE_PILL = onSolid;
const ACTIVE_TEXT = onWhite;
const IDLE = "rgba(255, 255, 255, 0.72)";
const SPRING = LinearTransition.springify().damping(18).stiffness(220).mass(0.7);

/**
 * The tab bar on Android and the web preview: a dark floating pill (in both themes). Icons only, calm; the selected
 * tab grows into a white pill that shows its name, so it's never a guessing game.
 * Screen readers always hear every tab's name. iPhone keeps the system bar.
 * Sits in the layout (not over it), so it never covers a list's last row.
 */
export function FloatingTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const reduce = useReducedMotion();
  // Ink in light mode; a lifted grey in dark, where black would vanish into the page.
  const barColor = scheme === "dark" ? tabBarDark : colors.ink;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, space.sm) + space.xs }]}>
      <View style={[styles.bar, { backgroundColor: barColor, boxShadow: BAR_SHADOW }]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const options = descriptors[route.key]!.options;
          const focused = state.index === i;
          const color = focused ? ACTIVE_TEXT : IDLE;
          const label = typeof options.title === "string" ? options.title : route.name;
          const badge = options.tabBarBadge;
          return (
            <Animated.View key={route.key} layout={reduce ? undefined : SPRING} style={focused ? styles.slotFocused : styles.slot}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={badge ? `${label}, ${badge}` : label}
                onPress={() => {
                  if (!focused) haptics.selection();
                  navigateToTab(route.key);
                }}
                style={[styles.item, focused && { backgroundColor: ACTIVE_PILL }]}
              >
                <View>
                  {options.tabBarIcon?.({ focused, color, size: 22 })}
                  {badge != null ? (
                    <View style={[styles.badge, { backgroundColor: colors.primaryFill, borderColor: focused ? ACTIVE_PILL : barColor }]}>
                      <Text variant="caption" style={{ color: colors.onPrimary, fontSize: 10, lineHeight: 13 }}>
                        {String(badge)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {focused ? (
                  <Animated.View entering={reduce ? undefined : FadeIn.duration(180).delay(60)}>
                    <Text variant="caption" style={{ color, fontFamily: fonts.semibold, fontSize: 13 }} numberOfLines={1}>
                      {label}
                    </Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.xs },
  bar: { flexDirection: "row", borderRadius: radius.pill, padding: PAD, height: 66, gap: 2 },
  slot: { flex: 1 },
  // The selected tab takes more room, for its name beside the icon.
  slotFocused: { flex: 2.3 },
  item: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs + 2, borderRadius: radius.pill },
  badge: { position: "absolute", top: -6, right: -10, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
