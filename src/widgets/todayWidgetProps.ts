import { flattenOver } from "@/theme/brand";
import type { Palette } from "@/theme/tokens";
import type { MyDayCounter } from "@/types/home";

/**
 * Everything the home-screen widget draws. The widget runs in its own tiny runtime (no i18n, no theme, no app
 * state), so the app hands it finished text and opaque colours. Pure — unit tested.
 */
export type TodayWidgetProps = {
  signedIn: boolean;
  title: string;
  /** "Updated 1:34 PM", or the sign-in hint when signed out. */
  subtitle: string;
  stats: { count: number; label: string }[];
  /** The first thing to do, or "You're all caught up". */
  next: string;
  colors: { bg: string; fg: string; muted: string; tile: string };
};

export type WidgetPalette = Pick<Palette, "heroFrom" | "onHero" | "onHeroMuted" | "heroGlass">;

/** The widget's colours: Today's hero, flattened (widgets take no transparency). */
export function widgetColors(p: WidgetPalette): TodayWidgetProps["colors"] {
  return { bg: p.heroFrom, fg: flattenOver(p.onHero, p.heroFrom), muted: flattenOver(p.onHeroMuted, p.heroFrom), tile: flattenOver(p.heroGlass, p.heroFrom) };
}

/** The hero's three counters, in the hero's order, with the server's labels (else the app's). */
export const WIDGET_COUNTERS = ["replies", "calls_due", "meetings"] as const;

export function todayWidgetProps(input: {
  workspace: string;
  counters: MyDayCounter[] | null;
  next: string;
  updated: string;
  fallbackLabels: Record<(typeof WIDGET_COUNTERS)[number], string>;
  palette: WidgetPalette;
}): TodayWidgetProps {
  return {
    signedIn: true,
    title: input.workspace,
    subtitle: input.updated,
    stats: WIDGET_COUNTERS.map((key) => {
      const c = input.counters?.find((x) => x.key === key);
      return { count: c?.count ?? 0, label: c?.label || input.fallbackLabels[key] };
    }),
    next: input.next,
    colors: widgetColors(input.palette),
  };
}

/** Signed out (or before the first sign-in): no numbers from the last account stay on the home screen. */
export function signedOutWidgetProps(input: { title: string; hint: string; palette: WidgetPalette }): TodayWidgetProps {
  return { signedIn: false, title: input.title, subtitle: input.hint, stats: [], next: "", colors: widgetColors(input.palette) };
}
