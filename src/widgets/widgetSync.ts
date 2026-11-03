import { useEffect } from "react";
import { getIntlLocale, t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { palettes } from "@/theme/tokens";
import type { MyDayCounter } from "@/types/home";
import TodayWidget from "./TodayWidget";
import { signedOutWidgetProps, todayWidgetProps, type TodayWidgetProps } from "./todayWidgetProps";

/** Best effort: the home screen must never break the app (no widget placed, an older build without the module). */
function show(props: TodayWidgetProps): void {
  try {
    TodayWidget.updateSnapshot(props);
  } catch {
    // Nothing to show it on.
  }
}

/**
 * Keeps the home-screen widget in step with Today: called by the Today screen with what it already loaded, so the
 * widget costs no extra request. It refreshes whenever Today does (opening the app, pull to refresh, switching).
 */
export function useTodayWidgetSync(input: { workspace: string | null; counters: MyDayCounter[] | null; next: string | null; ready: boolean; loadedAt: number }): void {
  const { colors } = useTheme();
  // `loadedAt` (when Today last loaded) moves on every refresh, even when the numbers come back the same.
  const { workspace, counters, next, ready, loadedAt } = input;
  useEffect(() => {
    if (!ready) return;
    show(
      todayWidgetProps({
        workspace: workspace || t("widget.appName"),
        counters,
        next: next || t("today.allClear"),
        updated: t("widget.updated", { time: timeOfDay(loadedAt || Date.now(), getIntlLocale()) }),
        fallbackLabels: { replies: t("widget.replies"), calls_due: t("widget.callsDue"), meetings: t("widget.meetings") },
        palette: colors,
      })
    );
  }, [ready, loadedAt, workspace, counters, next, colors]);
}

/** On sign-out: the last account's numbers don't stay on the home screen. */
export function clearTodayWidget(): void {
  show(signedOutWidgetProps({ title: t("widget.appName"), hint: t("widget.signedOut"), palette: palettes.light }));
}
