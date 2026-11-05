import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshControl, type RefreshControlProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = Omit<RefreshControlProps, "refreshing" | "onRefresh"> & {
  /** The data is reloading (from a pull, or in the background). */
  busy: boolean;
  onRefresh: () => void;
  children?: ReactNode;
};

/**
 * The one pull-to-refresh control (Screen and every list use it): the spinner shows only for the person's own
 * pull, until that reload ends, never for the quiet background reloads when a tab opens. Passed as a scroll
 * view's `refreshControl`, which hands it the list as its child on Android.
 */
export function PullRefresh({ busy, onRefresh, children, ...rest }: Props) {
  const { colors } = useTheme();
  const [pulled, setPulled] = useState(false);
  const started = useRef(false);

  // After a pull: hide once the reload has started and ended; or after a moment if no reload was needed.
  useEffect(() => {
    if (!pulled) return;
    if (busy) {
      started.current = true;
      return;
    }
    if (started.current) {
      started.current = false;
      setPulled(false);
      return;
    }
    const t = setTimeout(() => {
      if (!started.current) setPulled(false);
    }, 900);
    return () => clearTimeout(t);
  }, [busy, pulled]);

  return (
    <RefreshControl
      tintColor={colors.textMuted}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      {...rest}
      refreshing={pulled}
      onRefresh={() => {
        started.current = false;
        setPulled(true);
        onRefresh();
      }}
    >
      {children}
    </RefreshControl>
  );
}
