import type { Board, Deal, Stage } from "@/types/pipeline";
import { pipelineInsights } from "./pipelineInsights";

const NOW = Date.parse("2026-11-05T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const stage = (id: number, probability: number, extra: Partial<Stage> = {}): Stage => ({ id, pipeline_id: 1, name: `S${id}`, sort_order: id, probability, is_won: false, is_lost: false, color: null, rotting_days: null, ...extra });
const deal = (id: number, stageId: number, amount: number | null, extra: Partial<Deal> = {}): Deal => ({
  id, name: `D${id}`, stage_id: stageId, pipeline_id: 1, amount, currency: "AED", status: "open", probability: null, expected_close_date: null,
  lead_id: null, account_id: null, owner_id: null, lost_reason: null, last_activity_at: daysAgo(1), ...extra,
});
const board = (stages: Stage[], deals: Deal[], weighted: Record<number, number> = {}): Board => ({
  pipeline_id: 1,
  stages,
  dealsByStage: Object.fromEntries(stages.map((s) => [String(s.id), deals.filter((d) => d.stage_id === s.id)])),
  stage_totals: Object.fromEntries(stages.map((s) => [String(s.id), { count: 0, value: 0, weighted_value: weighted[s.id] ?? 0, shown: 0 }])),
  per_stage_limit: 50,
});

describe("pipelineInsights", () => {
  it("is empty without a board", () => {
    expect(pipelineInsights(undefined, NOW)).toEqual({ next: null, stalled: null, expected: 0 });
  });

  it("picks the deal worth most after its chance, using the stage's chance when the deal has none", () => {
    const b = board([stage(1, 10), stage(2, 60)], [deal(1, 1, 50_000), deal(2, 2, 12_000), deal(3, 2, 5_000, { probability: 90 })]);
    const r = pipelineInsights(b, NOW);
    expect(r.next?.deal.id).toBe(2);
    expect(r.next?.chance).toBe(60);
  });

  it("ignores won and lost stages, and sums the open stages' weighted value", () => {
    const b = board([stage(1, 20), stage(9, 100, { is_won: true })], [deal(1, 1, 1_000), deal(2, 9, 99_000)], { 1: 200, 9: 99_000 });
    const r = pipelineInsights(b, NOW);
    expect(r.next?.deal.id).toBe(1);
    expect(r.expected).toBe(200);
  });

  it("counts deals with no activity for a week and reports the longest wait", () => {
    const b = board([stage(1, 10)], [deal(1, 1, 100, { last_activity_at: daysAgo(9) }), deal(2, 1, 100, { last_activity_at: daysAgo(12) }), deal(3, 1, 100, { last_activity_at: daysAgo(3) })]);
    expect(pipelineInsights(b, NOW).stalled).toEqual({ count: 2, days: 12 });
  });

  it("still names a deal when amounts are hidden", () => {
    const b = board([stage(1, 10), stage(2, 50)], [deal(1, 1, null), deal(2, 2, null)]);
    expect(pipelineInsights(b, NOW).next?.deal.id).toBe(2);
  });
});
