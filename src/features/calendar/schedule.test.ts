import type { Meeting } from "@/types/calendar";
import { agenda, canJoin, countByDay, meetingPhase, meetingWith } from "./schedule";

const NOW = new Date(2026, 10, 3, 14, 0);
const now = NOW.getTime();
const min = 60_000;
const meeting = (id: number, due: Date | null, extra: Partial<Meeting> = {}): Meeting =>
  ({ id, title: `M${id}`, due_at: due ? due.toISOString() : null, status: "pending", outcome: null, join_url: null, contact_name: null, company: null, ...extra }) as Meeting;

describe("schedule", () => {
  it("knows where a meeting stands", () => {
    const due = (offsetMin: number) => new Date(now + offsetMin * min).toISOString();
    expect(meetingPhase({ status: "pending", outcome: null, due_at: due(90) }, now)).toBe("upcoming");
    expect(meetingPhase({ status: "pending", outcome: null, due_at: due(20) }, now)).toBe("soon");
    expect(meetingPhase({ status: "pending", outcome: null, due_at: due(-30) }, now)).toBe("now");
    expect(meetingPhase({ status: "pending", outcome: null, due_at: due(-180) }, now)).toBe("needs_outcome");
    expect(meetingPhase({ status: "completed", outcome: "no_show", due_at: due(-180) }, now)).toBe("no_show");
    expect(meetingPhase({ status: "completed", outcome: "attended", due_at: due(-180) }, now)).toBe("attended");
    expect(meetingPhase({ status: "cancelled", outcome: "cancelled", due_at: due(60) }, now)).toBe("cancelled");
  });

  it("offers Join only while the meeting can still happen", () => {
    const m = (offsetMin: number, join_url: string | null) => ({ status: "pending", outcome: null, due_at: new Date(now + offsetMin * min).toISOString(), join_url });
    expect(canJoin(m(10, "https://meet.example/x"), now)).toBe(true);
    expect(canJoin(m(10, null), now)).toBe(false);
    expect(canJoin(m(-30, "https://meet.example/x"), now)).toBe(true);
    expect(canJoin(m(240, "https://meet.example/x"), now)).toBe(false); // hours away: the link is in the details
    expect(canJoin(m(-300, "https://meet.example/x"), now)).toBe(false);
  });

  it("puts a header before each new day", () => {
    const items = agenda([meeting(1, new Date(2026, 10, 3, 16)), meeting(2, new Date(2026, 10, 3, 17)), meeting(3, new Date(2026, 10, 4, 9)), meeting(4, new Date(2026, 10, 9, 9))], NOW);
    expect(items.map((i) => (i.type === "header" ? i.day : i.key))).toEqual(["today", "m-1", "m-2", "tomorrow", "m-3", "date", "m-4"]);
  });

  it("counts meetings per day, skipping cancelled ones", () => {
    const counts = countByDay([meeting(1, new Date(2026, 10, 3, 9)), meeting(2, new Date(2026, 10, 3, 11)), meeting(3, new Date(2026, 10, 3, 12), { status: "cancelled" })]);
    expect(counts.get("2026-11-03")).toBe(2);
  });

  it("says who it's with", () => {
    expect(meetingWith({ contact_name: "Sara Ahmed", company: "Northwind" })).toBe("Sara Ahmed · Northwind");
    expect(meetingWith({ contact_name: null, company: null })).toBeNull();
  });
});
