import { useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Swipeable, { SwipeDirection, type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from "react-native-reanimated";
import { onSolid, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, type IconComponent } from "./icons";
import { Text } from "./Text";

export type SwipeAction = { label: string; icon: IconComponent; color: string; onTrigger: () => void };

const ACTION_WIDTH = 88;

function ActionPanel({ action, progress, side }: { action: SwipeAction; progress: SharedValue<number>; side: "left" | "right" }) {
  const Icon = action.icon;
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <View style={[styles.panel, { backgroundColor: action.color, alignItems: side === "left" ? "flex-start" : "flex-end" }]}>
      <Animated.View style={[styles.panelContent, content]}>
        <Icon size={22} color={onSolid} strokeWidth={ICON_STROKE + 0.25} />
        <Text variant="caption" style={styles.panelLabel}>
          {action.label}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * A full swipe triggers the action (with a haptic), then the row springs back. Same rule on every list:
 * swipe right = left action (read/unread, complete), swipe left = right action (archive, delete).
 */
export function SwipeableRow({ left, right, children }: { left?: SwipeAction; right?: SwipeAction; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <Swipeable
      ref={ref}
      friction={1.6}
      overshootFriction={8}
      leftThreshold={ACTION_WIDTH}
      rightThreshold={ACTION_WIDTH}
      renderLeftActions={left ? (progress) => <ActionPanel action={left} progress={progress} side="left" /> : undefined}
      renderRightActions={right ? (progress) => <ActionPanel action={right} progress={progress} side="right" /> : undefined}
      onSwipeableOpen={(direction) => {
        haptics.light();
        // Opening from the left edge reveals the left actions.
        const action = direction === SwipeDirection.RIGHT ? left : right;
        action?.onTrigger();
        ref.current?.close();
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, justifyContent: "center", minWidth: ACTION_WIDTH },
  panelContent: { width: ACTION_WIDTH, alignItems: "center", gap: space.xs },
  panelLabel: { color: onSolid },
});
