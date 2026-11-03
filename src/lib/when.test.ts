import { addDays, dayKey, daysBetween, defaultTime, nextDays, splitIso, timeSlots, toIso } from "./when";

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);

describe("when", () => {
  it("keys days in local time", () => {
    expect(dayKey(at(2026, 11, 1, 23, 59))).toBe("2026-11-01");
    expect(dayKey(addDays(at(2026, 11, 30), 1))).toBe("2026-12-01");
  });

  it("counts whole days across months", () => {
    expect(daysBetween(at(2026, 11, 30, 22), at(2026, 12, 1, 1))).toBe(1);
    expect(daysBetween(at(2026, 11, 2), at(2026, 11, 1))).toBe(-1);
  });

  it("lists the next days from today", () => {
    const days = nextDays(at(2026, 11, 1, 15), 3);
    expect(days.map((d) => d.key)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
  });

  it("offers only slots still ahead today, all of them on later days", () => {
    const now = at(2026, 11, 1, 14, 20);
    expect(timeSlots("2026-11-01", now)[0]).toBe("14:30");
    expect(timeSlots("2026-11-02", now)).toHaveLength(30);
    expect(timeSlots("2026-11-01", at(2026, 11, 1, 22))).toEqual([]);
  });

  it("defaults to 9:00, else today's next slot, else nothing", () => {
    expect(defaultTime("2026-11-02", at(2026, 11, 1, 14))).toBe("09:00");
    expect(defaultTime("2026-11-01", at(2026, 11, 1, 14, 40))).toBe("15:00");
    expect(defaultTime("2026-11-01", at(2026, 11, 1, 22))).toBeNull();
  });

  it("round-trips a local day and time through ISO", () => {
    expect(splitIso(toIso("2026-11-05", "09:30"))).toEqual({ day: "2026-11-05", time: "09:30" });
    expect(splitIso(null)).toBeNull();
    expect(splitIso("nope")).toBeNull();
  });
});
