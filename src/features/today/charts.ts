/** Pure maths behind Today's KPI comparison bars and pipeline bar. Unit tested. */

/** The numbers that matter day to day, shown first; the rest wait behind "See all". */
const KEY_METRICS = ["positive_replies", "meetings", "pipeline", "won"];

/** Pure: the key metrics first (in that order, only those present), then the others; `top` is how many show folded. */
export function orderMetrics<T extends { key: string }>(metrics: T[], top = 4): { shown: T[]; rest: T[] } {
  const key = KEY_METRICS.map((k) => metrics.find((m) => m.key === k)).filter((m): m is T => m != null);
  const others = metrics.filter((m) => !KEY_METRICS.includes(m.key));
  const ordered = [...key, ...others];
  return { shown: ordered.slice(0, top), rest: ordered.slice(top) };
}

/** Without the pipeline (no deals access), the wide card goes to the first of these that moved. */
const HIGHLIGHT_ORDER = ["won", "positive_replies", "meetings"];

/**
 * Pure: the wide highlight card and the tiles below it. Pipeline value always takes the card when the user can
 * see it (it's what the business is worth right now, so it stays in one place); else the first in
 * HIGHLIGHT_ORDER above zero; else the first shown, so the layout stays put.
 */
export function splitHighlight<T extends { key: string; value: number }>(metrics: T[]): { highlight: T | null; tiles: T[] } {
  const highlight =
    metrics.find((m) => m.key === "pipeline") ??
    HIGHLIGHT_ORDER.map((k) => metrics.find((m) => m.key === k && m.value > 0)).find((m) => m != null) ??
    metrics[0] ??
    null;
  return { highlight, tiles: metrics.filter((m) => m !== highlight) };
}

/** The steps from a found lead to a won deal, in order. "won" counts deals (its value is money). */
const FUNNEL = ["leads_found", "contacted", "positive_replies", "meetings", "won"] as const;

export type FunnelStep = {
  key: (typeof FUNNEL)[number];
  value: number;
  /** Bar length, 0–1 (the largest step is full). */
  share: number;
  /** This step as a share of the one before (0–1); null for the first step, after a zero, or above 100% (the
   * counts are per period, not one cohort, so a later step can outnumber an earlier one). */
  rate: number | null;
};

/**
 * Pure: the funnel from the KPI metrics, skipping steps the user can't see. Null when there's nothing to draw
 * (fewer than three steps, or every step zero).
 */
export function funnelSteps(metrics: { key: string; value: number; facts?: Record<string, number> }[]): FunnelStep[] | null {
  const found = FUNNEL.map((key) => {
    const m = metrics.find((x) => x.key === key);
    if (!m) return null;
    const value = key === "won" ? (m.facts?.deals_won ?? null) : m.value;
    return value == null ? null : { key, value: Math.max(0, value) };
  }).filter((s): s is { key: FunnelStep["key"]; value: number } => s != null);
  const max = Math.max(0, ...found.map((s) => s.value));
  if (found.length < 3 || max === 0) return null;
  return found.map((s, i) => {
    const before = i > 0 ? found[i - 1]!.value : 0;
    const rate = before > 0 && s.value <= before ? s.value / before : null;
    return { ...s, share: s.value / max, rate };
  });
}

/**
 * Last period and this one as bar heights (0–1, the larger is full). Null without a last period to compare with
 * (its "New" badge says that already — a lone bar would say nothing).
 */
export function compareHeights(previous: number, value: number): { prev: number; now: number } | null {
  const max = Math.max(previous, value);
  if (!(previous > 0) || !(max > 0)) return null;
  return { prev: previous / max, now: value / max };
}

/**
 * Pure: a workspace with nothing in it yet — every number zero, no open deals, no conversations. Today then shows
 * first steps instead of sections full of zeros. Unknown sections (locked, no access) count as empty.
 */
export function isFreshWorkspace(metrics: { value: number }[], openDeals: number, conversations: number): boolean {
  return metrics.every((m) => m.value === 0) && openDeals === 0 && conversations === 0;
}

/**
 * Pure: the numbers for the Performance tiles. When the funnel is shown, the counts it already lists are left
 * out, so each number appears once. "won" stays: its tile is money, the funnel's step counts deals.
 */
export function performanceMetrics<T extends { key: string }>(metrics: T[], funnel: Pick<FunnelStep, "key">[] | null): T[] {
  if (!funnel) return metrics;
  const listed = new Set<string>(funnel.map((s) => s.key).filter((k) => k !== "won"));
  return metrics.filter((m) => !listed.has(m.key));
}

/** The numbers worth a glance first, best first: money, then the conversations and meetings, then the reach. */
const STAT_ORDER = ["won", "pipeline", "positive_replies", "meetings", "contacted", "leads_found", "qualified", "verified"];

/** Pure: up to `max` numbers above zero, in STAT_ORDER (others after); none when nothing has moved yet. */
export function topStats<T extends { key: string; value: number }>(metrics: T[], max = 3): T[] {
  const rank = (k: string) => (STAT_ORDER.includes(k) ? STAT_ORDER.indexOf(k) : STAT_ORDER.length);
  return metrics
    .filter((m) => m.value > 0)
    .sort((a, b) => rank(a.key) - rank(b.key))
    .slice(0, max);
}

/** A rate from fewer people than this says nothing yet ("0% of 2 contacted"), so it can't be the biggest drop. */
export const MIN_DROP_BASE = 20;

/** Pure: the funnel step with the lowest pass-through rate (needs two rates, each from enough people), or null. */
export function biggestDrop(steps: FunnelStep[]): FunnelStep | null {
  const rated = steps.filter((s, i) => s.rate != null && i > 0 && steps[i - 1]!.value >= MIN_DROP_BASE);
  if (rated.length < 2) return null;
  return rated.reduce((low, s) => (s.rate! < low.rate! ? s : low));
}

/** Each stage's shade, lighter for early stages and full colour for the last (closest to won); never too pale to see. */
export function stageShade(index: number, count: number): number {
  return count <= 1 ? 1 : 0.5 + (0.5 * index) / (count - 1);
}

/** Each stage's share of the open value (0–1); an empty pipeline shares nothing. */
export function stageShares(values: number[]): number[] {
  const total = values.reduce((n, v) => n + Math.max(0, v), 0);
  return values.map((v) => (total > 0 ? Math.max(0, v) / total : 0));
}
