import { freshSuggestions, todayHeadline } from "./headline";

const c = (key: string, count: number, urgent = false) => ({ key, count, urgent });

describe("todayHeadline", () => {
  it("suggests something the phone can do when nothing is waiting", () => {
    expect(todayHeadline([c("replies", 0), c("meetings", 0)])).toEqual({ key: "today.headlineClear" });
    expect(todayHeadline([])).toEqual({ key: "today.headlineClear" });
  });
  it("puts replies first, then urgent items, then the total — like the web", () => {
    expect(todayHeadline([c("replies", 1), c("calls_due", 3, true)])).toEqual({ key: "today.headlineReplyOne" });
    expect(todayHeadline([c("replies", 4)])).toEqual({ key: "today.headlineReplies", vars: { count: 4 } });
    expect(todayHeadline([c("replies", 0), c("calls_due", 2, true), c("meetings", 1)])).toEqual({ key: "today.headlineUrgent", vars: { count: 2 } });
    expect(todayHeadline([c("meetings", 1)])).toEqual({ key: "today.headlineItemOne" });
    expect(todayHeadline([c("meetings", 2), c("followups", 1)])).toEqual({ key: "today.headlineItems", vars: { count: 3 } });
    // Approvals come right after replies, and count even when the counters are all zero.
    expect(todayHeadline([c("replies", 0)], 1)).toEqual({ key: "today.headlineApprovalOne" });
    expect(todayHeadline([c("calls_due", 2, true)], 3)).toEqual({ key: "today.headlineApprovals", vars: { count: 3 } });
    expect(todayHeadline([c("replies", 2)], 3).key).toBe("today.headlineReplies");
  });
});

describe("freshSuggestions", () => {
  const rec = (key: string, href: string) => ({ key, text: key, action: "Open", href, tone: "attention" as const, weight: 1, count: 1 });
  it("drops suggestions that point where an Up next item already does", () => {
    const items = [{ actions: [{ kind: "open" as const, label: "Open", href: "/inbox?thread=3" }] }];
    const kept = freshSuggestions([rec("waiting", "/bases/3/inbox"), rec("stale", "/crm")], items);
    expect(kept.map((r) => r.key)).toEqual(["stale"]);
    expect(freshSuggestions([rec("waiting", "/inbox")], [])).toHaveLength(1);
  });
});
