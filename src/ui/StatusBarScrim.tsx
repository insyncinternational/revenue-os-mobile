import { useCallback, useEffect, useState } from "react";
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

/** How far a tab scrolls before the status bar needs its own background: almost at once, since the header text starts right under it. */
const SHOW_AFTER = 8;

/**
 * The status bar on a tab screen has no background of its own. Once the header has scrolled away, rows and
 * cards would slide under the clock and icons; this says when to show a band behind them. Pass `onScroll` to
 * the screen's list (it only re-renders when the answer flips).
 */
export function useStatusBarScrim() {
  const [shown, setShown] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > SHOW_AFTER;
    setShown((was) => (was === next ? was : next));
  }, []);
  return { shown, onScroll };
}

/** The band behind the status bar, in the page colour so the icons stay readable over content. Fades in and out. */
export function StatusBarScrim({ shown }: { shown: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(withTiming(shown ? 1 : 0, { duration: 160 }));
  }, [shown, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!insets.top) return null;
  return <Animated.View pointerEvents="none" style={[styles.scrim, { height: insets.top, backgroundColor: colors.background }, fade]} />;
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
});
