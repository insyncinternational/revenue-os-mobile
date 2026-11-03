import type { Stage } from "@/types/pipeline";
import { closeDateChoices, daysInStage, dealBody, isRotting, nextStage, orderedStages, stageProgress } from "./pipeline";

const st = (id: number, sort_order: number, extra: Partial<Stage> = {}): Stage =>
  ({ id, pipeline_id: 1, name: `S${id}`, sort_order, probability: 10, is_won: false, is_lost: false, color: null, rotting_days: null, ...extra }) as Stage;
const stages = [st(3, 2), st(1, 0), st(2, 1), st(9, 3, { is_won: true }), st(8, 4, { is_lost: true })];

describe("stages", () => {
  it("orders by sort order", () => {
    expect(orderedStages(stages).map((s) => s.id)).toEqual([1, 2, 3, 9, 8]);
  });
  it("advances through open stages only", () => {
    expect(nextStage(stages, 1)?.id).toBe(2);
    expect(nextStage(stages, 3)).toBeNull();
    expect(nextStage(stages, 999)).toBeNull();
  });
  it("measures progress", () => {
    expect(stageProgress(stages, { stage_id: 1, status: "open" })).toBeCloseTo(0.25);
    expect(stageProgress(stages, { stage_id: 9, status: "won" })).toBe(1);
    expect(stageProgress(stages, { stage_id: 8, status: "lost" })).toBe(0);
  });
});

describe("time in stage", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");
  it("counts whole days and flags rotting deals", () => {
    expect(daysInStage({ stage_entered_at: "2026-11-01T12:00:00Z" }, now)).toBe(9);
    expect(daysInStage({ stage_entered_at: null }, now)).toBeNull();
    expect(isRotting({ stage_entered_at: "2026-11-01T12:00:00Z", status: "open" }, { rotting_days: 7 }, now)).toBe(true);
    expect(isRotting({ stage_entered_at: "2026-11-01T12:00:00Z", status: "won" }, { rotting_days: 7 }, now)).toBe(false);
    expect(isRotting({ stage_entered_at: "2026-11-08T12:00:00Z", status: "open" }, { rotting_days: 7 }, now)).toBe(false);
  });
});

describe("dealBody", () => {
  const base = { name: " Catering for 40 ", amount: "12,500", currency: "AED", stage_id: 2, lead_id: 7, expected_close_date: "2026-11-30" };
  it("builds a clean body", () => {
    expect(dealBody(base)).toEqual({ ok: true, body: { name: "Catering for 40", amount: 12500, currency: "AED", stage_id: 2, lead_id: 7, expected_close_date: "2026-11-30" } });
  });
  it("allows no amount, refuses bad ones and a missing name", () => {
    expect(dealBody({ ...base, amount: "" })).toMatchObject({ ok: true });
    expect(dealBody({ ...base, amount: "abc" })).toEqual({ ok: false, field: "amount" });
    expect(dealBody({ ...base, amount: "-5" })).toEqual({ ok: false, field: "amount" });
    expect(dealBody({ ...base, name: "  " })).toEqual({ ok: false, field: "name" });
  });
  it("clears an emptied amount or close date when editing, and leaves them out for a new deal", () => {
    const empty = { ...base, amount: "", expected_close_date: null };
    expect(dealBody(empty, "update")).toMatchObject({ ok: true, body: { amount: null, expected_close_date: null } });
    const created = dealBody(empty, "create");
    expect(created.ok && "amount" in created.body).toBe(false);
    expect(created.ok && "expected_close_date" in created.body).toBe(false);
  });
});

describe("closeDateChoices", () => {
  it("gives month ends", () => {
    expect(closeDateChoices(new Date(2026, 10, 1)).map((c) => c.date)).toEqual(["2026-11-30", "2026-12-31", "2027-02-28"]);
  });
});
