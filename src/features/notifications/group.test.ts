import type { NotificationRow } from "@/types/notifications";
import { categoryOf, groupByDay } from "./group";

const row = (id: number, created_at: string, extra: Partial<NotificationRow> = {}): NotificationRow => ({
  id,
  type: "system",
  title: `n${id}`,
  message: null,
  category: null,
  metadata: null,
  base_id: null,
  read_at: null,
  created_at,
  ...extra,
});

describe("groupByDay", () => {
  const now = new Date(2026, 10, 1, 15, 0);
  it("puts one header before each day, newest first", () => {
    const feed = groupByDay(
      [
        row(1, new Date(2026, 10, 1, 14, 0).toISOString()),
        row(2, new Date(2026, 10, 1, 9, 0).toISOString()),
        row(3, new Date(2026, 9, 31, 20, 0).toISOString()),
        row(4, new Date(2026, 9, 25, 8, 0).toISOString()),
      ],
      now
    );
    expect(feed.map((f) => (f.type === "header" ? f.day : f.row.id))).toEqual(["today", 1, 2, "yesterday", 3, "date", 4]);
  });
  it("handles an empty list", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});

describe("categoryOf", () => {
  it("prefers the column, then metadata, then the legacy type", () => {
    expect(categoryOf(row(1, "", { category: "inbox" }))).toBe("inbox");
    expect(categoryOf(row(1, "", { metadata: { category: "meeting" } }))).toBe("meeting");
    expect(categoryOf(row(1, "", { type: "lead_assigned" }))).toBe("assignment");
    expect(categoryOf(row(1, ""))).toBe("system");
  });
});
