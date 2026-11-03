import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Swipeable, { SwipeDirection, type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from "react-native-reanimated";
import { onSolid, space } from "@/theme/tokens";
import { haptics } from "@/lib/haptics";
import { ICON_STROKE, type IconComponent } from "./icons";
import { SwipeStartedAt } from "./PressableScale";
import { Text } from "./Text";

/** `removes`: the action takes the row out of the list (archive, done, move on), so it doesn't spring back first. */
export type SwipeAction = { label: string; icon: IconComponent; color: string; onTrigger: () => void; removes?: boolean };

const ACTION_WIDTH = 88;

function ActionPanel({ action, progress, side }: { action: SwipeAction; progress: SharedValue<number>; side: "left" | "right" }) {
  const Icon = action.icon;
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
  }));
  // Hidden at rest: the row covers it exactly, but at fractional pixel edges its colour would bleed through as hairlines.
  const panel = useAnimatedStyle(() => ({ opacity: progress.value > 0.005 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.panel, { backgroundColor: action.color, alignItems: side === "left" ? "flex-start" : "flex-end" }, panel]}>
      <Animated.View style={[styles.panelContent, content]}>
        <Icon size={22} color={onSolid} strokeWidth={ICON_STROKE + 0.25} />
        <Text variant="caption" style={styles.panelLabel}>
          {action.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * A full swipe triggers the action (with a haptic), then the row springs back. Same rule on every list:
 * swipe right = left action (read/unread, complete), swipe left = right action (archive, delete).
 */
/**
 * Full width only: an inset swipe area (margins on it or around it) is measured wrong on web and won't open. Put a
 * card's margins inside the row, on an opaque layer, as the task and deal rows do.
 */
export function SwipeableRow({ id, left, right, children }: { id: string | number; left?: SwipeAction; right?: SwipeAction; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  // Rows inside ignore the tap that ends a swipe (see PressableScale).
  const startedAt = useRef(0);
  // Lists recycle row views: a view that was swiped open for one item must show the next one closed.
  useEffect(() => {
    ref.current?.reset();
  }, [id]);
  return (
    <SwipeStartedAt.Provider value={startedAt}>
      <Swipeable
        ref={ref}
        friction={1.6}
        overshootFriction={8}
        leftThreshold={ACTION_WIDTH}
        rightThreshold={ACTION_WIDTH}
        renderLeftActions={left ? (progress) => <ActionPanel action={left} progress={progress} side="left" /> : undefined}
        renderRightActions={right ? (progress) => <ActionPanel action={right} progress={progress} side="right" /> : undefined}
        onSwipeableOpenStartDrag={() => {
          startedAt.current = Date.now();
        }}
        onSwipeableOpen={(direction) => {
          startedAt.current = Date.now();
          haptics.light();
          // Opening from the left edge reveals the left actions.
          const action = direction === SwipeDirection.RIGHT ? left : right;
          if (!action) return ref.current?.close();
          // A removing action takes the row away as it is (springing back first would only delay it, and the
          // close animation must not outlive the row); anything else springs back.
          if (!action.removes) ref.current?.close();
          action.onTrigger();
          // If the row is still on screen next frame (the deal moved to a tab that's now shown, or the change was
          // rolled back), snap it shut — instantly, so no animation can outlive a row that did go away.
          if (action.removes) requestAnimationFrame(() => ref.current?.reset());
        }}
      >
        {children}
      </Swipeable>
    </SwipeStartedAt.Provider>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, justifyContent: "center", minWidth: ACTION_WIDTH },
  panelContent: { width: ACTION_WIDTH, alignItems: "center", gap: space.xs },
  panelLabel: { color: onSolid },
});
