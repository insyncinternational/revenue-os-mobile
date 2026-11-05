import type { Board, Deal } from "@/types/pipeline";

/** A deal with no activity for this many days counts as not moving. */
export const STALLED_DAYS = 7;

const DAY = 86_400_000;

export type PipelineInsights = {
  /** The open deal most likely to bring money in next (chance × amount, then the nearest close date). */
  next: { deal: Deal; chance: number | null } | null;
  /** Open deals with no activity for STALLED_DAYS or more, and the longest wait among them. */
  stalled: { count: number; days: number } | null;
  /** Open value weighted by each stage's chance to close (the board's own totals). */
  expected: number;
};

/** Pure: what Today's pipeline card says beyond the total, from the Deals tab's board. */
export function pipelineInsights(board: Board | undefined, now: number): PipelineInsights {
  if (!board) return { next: null, stalled: null, expected: 0 };
  const open = board.stages.filter((s) => !s.is_won && !s.is_lost);
  const chanceOf = (d: Deal) => d.probability ?? open.find((s) => s.id === d.stage_id)?.probability ?? null;
  const deals = open.flatMap((s) => board.dealsByStage[String(s.id)] ?? []).filter((d) => d.status === "open");

  const closeAt = (d: Deal) => (d.expected_close_date ? Date.parse(d.expected_close_date) : Infinity);
  const score = (d: Deal) => ((chanceOf(d) ?? 0) / 100) * (d.amount ?? 0);
  const best = [...deals].sort((a, b) => score(b) - score(a) || (chanceOf(b) ?? 0) - (chanceOf(a) ?? 0) || closeAt(a) - closeAt(b))[0];

  const quiet = deals
    .map((d) => {
      const last = Date.parse(d.last_activity_at ?? d.stage_entered_at ?? d.updatedAt ?? "");
      return Number.isFinite(last) ? Math.floor((now - last) / DAY) : null;
    })
    .filter((days): days is number => days != null && days >= STALLED_DAYS);

  const expected = open.reduce((sum, s) => sum + (board.stage_totals[String(s.id)]?.weighted_value ?? 0), 0);
  return {
    next: best ? { deal: best, chance: chanceOf(best) } : null,
    stalled: quiet.length ? { count: quiet.length, days: Math.max(...quiet) } : null,
    expected,
  };
}
