import { biggestDrop, compareHeights, funnelSteps, isFreshWorkspace, orderMetrics, performanceMetrics, splitHighlight, topStats, stageShade, stageShares } from "./charts";

describe("Today charts", () => {
  it("puts the day-to-day numbers first and folds the rest", () => {
    const m = ["leads_found", "verified", "contacted", "positive_replies", "qualified", "meetings", "pipeline", "won"].map((key) => ({ key }));
    const { shown, rest } = orderMetrics(m);
    expect(shown.map((x) => x.key)).toEqual(["positive_replies", "meetings", "pipeline", "won"]);
    expect(rest.map((x) => x.key)).toEqual(["leads_found", "verified", "contacted", "qualified"]);
    // Money hidden from this user: the next numbers fill the four places.
    expect(orderMetrics(m.filter((x) => x.key !== "pipeline" && x.key !== "won")).shown.map((x) => x.key)).toEqual(["positive_replies", "meetings", "leads_found", "verified"]);
  });

  it("gives the wide card to pipeline value, else the number that moved", () => {
    const m = (key: string, value: number) => ({ key, value });
    const list = [m("positive_replies", 3), m("meetings", 0), m("pipeline", 6500), m("won", 0)];
    expect(splitHighlight(list).highlight?.key).toBe("pipeline");
    expect(splitHighlight(list).tiles.map((x) => x.key)).toEqual(["positive_replies", "meetings", "won"]);
    // Pipeline value keeps the card even at zero, so it never jumps around.
    expect(splitHighlight([m("positive_replies", 2), m("pipeline", 0)]).highlight?.key).toBe("pipeline");
    // No deals access: the first that moved.
    expect(splitHighlight([m("meetings", 1), m("positive_replies", 2)]).highlight?.key).toBe("positive_replies");
    // Nothing moved: the first one shown, so the layout stays put.
    expect(splitHighlight([m("meetings", 0), m("won", 0)]).highlight?.key).toBe("meetings");
    expect(splitHighlight([]).highlight).toBeNull();
  });

  it("builds the lead-to-win funnel", () => {
    const k = (key: string, value: number, facts?: Record<string, number>) => ({ key, value, facts });
    const steps = funnelSteps([k("leads_found", 40), k("contacted", 20), k("positive_replies", 5), k("meetings", 2), k("won", 9000, { deals_won: 1 })]);
    expect(steps?.map((s) => [s.key, s.value])).toEqual([["leads_found", 40], ["contacted", 20], ["positive_replies", 5], ["meetings", 2], ["won", 1]]);
    expect(steps?.map((s) => s.share)).toEqual([1, 0.5, 0.125, 0.05, 0.025]);
    expect(steps?.map((s) => s.rate)).toEqual([null, 0.5, 0.25, 0.4, 0.5]);
    // A later step above an earlier one (different people in the period) shows no rate; nor does a step after zero.
    const odd = funnelSteps([k("leads_found", 0), k("contacted", 3), k("positive_replies", 5)]);
    expect(odd?.map((s) => s.rate)).toEqual([null, null, null]);
    // Money hidden (no won facts) skips the step; too few steps or all zero draws nothing.
    expect(funnelSteps([k("leads_found", 4), k("contacted", 2), k("positive_replies", 1), k("won", 0)])?.map((s) => s.key)).toEqual(["leads_found", "contacted", "positive_replies"]);
    expect(funnelSteps([k("leads_found", 4), k("contacted", 2)])).toBeNull();
    expect(funnelSteps([k("leads_found", 0), k("contacted", 0), k("meetings", 0)])).toBeNull();
    // The footer names the weakest step (replies: 25% of contacted); one rate alone compares nothing.
    expect(biggestDrop(steps!)?.key).toBe("positive_replies");
    expect(biggestDrop(funnelSteps([k("leads_found", 4), k("contacted", 2), k("positive_replies", 9)])!)).toBeNull();
    // Rates from a handful of people ("0% of 2 contacted") never count as the biggest drop.
    expect(biggestDrop(funnelSteps([k("leads_found", 18), k("contacted", 2), k("positive_replies", 0), k("meetings", 0)])!)).toBeNull();
  });

  it("leaves the funnel's counts out of the Performance tiles", () => {
    const m = ["leads_found", "contacted", "positive_replies", "meetings", "pipeline", "won", "verified"].map((key) => ({ key }));
    const funnel = ["leads_found", "contacted", "positive_replies", "meetings", "won"].map((key) => ({ key }));
    // Won stays: its tile is money, the funnel step counts deals.
    expect(performanceMetrics(m, funnel as never).map((x) => x.key)).toEqual(["pipeline", "won", "verified"]);
    // No funnel drawn: every number keeps its tile.
    expect(performanceMetrics(m, null)).toHaveLength(7);
  });

  it("picks up to three numbers that moved, money first", () => {
    const m = (key: string, value: number) => ({ key, value });
    const list = [m("leads_found", 6), m("contacted", 2), m("positive_replies", 0), m("won", 0), m("verified", 10), m("pipeline", 4000)];
    expect(topStats(list).map((x) => x.key)).toEqual(["pipeline", "contacted", "leads_found"]);
    expect(topStats([m("won", 0), m("meetings", 0)])).toEqual([]);
  });

  it("spots a brand-new workspace", () => {
    const zero = [{ value: 0 }, { value: 0 }];
    expect(isFreshWorkspace(zero, 0, 0)).toBe(true);
    expect(isFreshWorkspace([], 0, 0)).toBe(true);
    // Any number, deal or conversation means there's something real to show.
    expect(isFreshWorkspace([{ value: 0 }, { value: 6 }], 0, 0)).toBe(false);
    expect(isFreshWorkspace(zero, 1, 0)).toBe(false);
    expect(isFreshWorkspace(zero, 0, 2)).toBe(false);
  });

  it("scales last period against this one", () => {
    expect(compareHeights(5, 10)).toEqual({ prev: 0.5, now: 1 });
    expect(compareHeights(8, 2)).toEqual({ prev: 1, now: 0.25 });
    expect(compareHeights(0, 0)).toBeNull();
    // Nothing last period: no comparison.
    expect(compareHeights(0, 3)).toBeNull();
  });

  it("shades stages from light to full colour", () => {
    expect(stageShade(0, 4)).toBeCloseTo(0.5);
    expect(stageShade(3, 4)).toBeCloseTo(1);
    expect(stageShade(0, 1)).toBe(1);
  });

  it("splits open value by stage", () => {
    expect(stageShares([6500, 0, 3500])).toEqual([0.65, 0, 0.35]);
    expect(stageShares([0, 0])).toEqual([0, 0]);
  });
});
