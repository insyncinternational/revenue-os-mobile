import { count, initials, money, percentChange, relativeTime, stableHash } from "./format";

const now = new Date(2026, 10, 1, 15, 0, 0); // Sun 1 Nov 2026, 15:00 local

describe("relativeTime", () => {
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("is short for recent items", () => {
    expect(relativeTime(ago(20_000), "en-US", now)).toBe("now");
    expect(relativeTime(ago(5 * 60_000), "en-US", now)).toBe("5m");
    expect(relativeTime(ago(3 * 3_600_000), "en-US", now)).toBe("3h");
  });
  it("uses Yesterday, weekday, then date", () => {
    expect(relativeTime(new Date(2026, 9, 31, 22, 0), "en-US", now)).toBe("Yesterday");
    expect(relativeTime(new Date(2026, 9, 28, 9, 0), "en-US", now)).toBe("Wed");
    expect(relativeTime(new Date(2026, 9, 12, 9, 0), "en-US", now)).toBe("Oct 12");
    expect(relativeTime(new Date(2025, 9, 12, 9, 0), "en-US", now)).toBe("Oct 12, 2025");
  });
  it("speaks the user's language", () => {
    expect(relativeTime(new Date(2026, 9, 31, 22, 0), "az", now)).toBe("Dünən");
  });
  it("returns empty text for invalid dates", () => {
    expect(relativeTime("not a date", "en-US", now)).toBe("");
  });
});

describe("money", () => {
  it("drops decimals for whole amounts and keeps them otherwise", () => {
    expect(money(1200, "USD")).toBe("$1,200");
    expect(money(19.5, "USD")).toBe("$19.50");
  });
  it("handles missing values and unknown currencies", () => {
    expect(money(null)).toBe("—");
    expect(money(10, "NOPE1")).toBe("NOPE1 10");
  });
  it("compacts large values", () => {
    expect(money(48250, "USD", "en-US", { compact: true })).toBe("$48.3K");
  });
});

describe("small helpers", () => {
  it("builds initials", () => {
    expect(initials("Sara Ahmed")).toBe("SA");
    expect(initials("madonna")).toBe("M");
    expect(initials("  ")).toBe("?");
    expect(initials("john.doe@acme.com")).toBe("JD");
    expect(initials("sales@acme.com")).toBe("S");
  });
  it("formats changes with a real minus sign", () => {
    expect(percentChange(12.4)).toBe("+12%");
    expect(percentChange(-4)).toBe("−4%");
    expect(percentChange(0.2)).toBe("0%");
    expect(percentChange(null)).toBe("");
  });
  it("counts compactly above 10k", () => {
    expect(count(1234)).toBe("1,234");
    expect(count(12_500)).toBe("12.5K");
  });
  it("hashes deterministically", () => {
    expect(stableHash("Sara")).toBe(stableHash("Sara"));
    expect(stableHash("Sara")).toBeGreaterThanOrEqual(0);
  });
  it("spreads names over all six avatar colours", () => {
    const names = ["Sara Ahmed", "James Carter", "Layla Hassan", "Omar Khalil", "Northwind Ltd", "Zainab", "Ali", "Fatima Noor", "Acme", "Bilal", "Hana Saeed", "Yusuf", "Mariam", "Khalid Rahman", "Noura", "Tariq", "Dana", "Rami", "Leen", "Faisal"];
    expect(new Set(names.map((n) => stableHash(n) % 6)).size).toBe(6);
  });
});
