import { dueDateIn, looksLikeEmail, minorDigits, normalizeDecimal, parseAmount, parseLines, parseQuantity, parseTaxBps, totals } from "./draft";

describe("invoice draft", () => {
  it("knows zero-decimal currencies", () => {
    expect(minorDigits("aed")).toBe(2);
    expect(minorDigits("JPY")).toBe(0);
  });

  it("reads a comma as the decimal point on comma-decimal keyboards", () => {
    expect(parseAmount("12,50", "aed")).toBe(1_250);
    expect(parseAmount("1250,5", "aed")).toBe(125_050);
    expect(parseAmount("1.250,50", "eur")).toBe(125_050);
    expect(parseAmount("1,250", "aed")).toBe(125_000);
    expect(normalizeDecimal("1,250,000.5")).toBe("1250000.5");
  });

  it("parses amounts into minor units", () => {
    expect(parseAmount("1,250.50", "aed")).toBe(125_050);
    expect(parseAmount("85", "usd")).toBe(8_500);
    expect(parseAmount(".5", "usd")).toBe(50);
    expect(parseAmount("1200", "jpy")).toBe(1_200);
    expect(parseAmount("", "usd")).toBeNull();
    expect(parseAmount("-5", "usd")).toBeNull();
    expect(parseAmount("abc", "usd")).toBeNull();
  });

  it("parses quantities and tax", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("0")).toBeNull();
    expect(parseTaxBps("")).toBe(0);
    expect(parseTaxBps("5")).toBe(500);
    expect(parseTaxBps("7.5")).toBe(750);
    expect(parseTaxBps("120")).toBeNull();
  });

  it("skips empty lines and flags unfinished ones", () => {
    const { lines, bad } = parseLines(
      [
        { key: "a", name: "Catering", quantity: "40", price: "85" },
        { key: "b", name: "", quantity: "1", price: "" },
        { key: "c", name: "Delivery", quantity: "1", price: "x" },
      ],
      "aed"
    );
    expect(lines).toEqual([{ name: "Catering", quantity: 40, unit_price_cents: 8_500 }]);
    expect([...bad]).toEqual(["c"]);
  });

  it("totals like the server: tax rounded once on the subtotal", () => {
    expect(totals([{ name: "A", quantity: 3, unit_price_cents: 333 }], 500)).toEqual({ subtotal: 999, tax: 50, total: 1_049 });
    expect(totals([], 0)).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it("works out due dates", () => {
    expect(dueDateIn("2026-11-01", 14)).toBe("2026-11-15");
    expect(dueDateIn("2026-12-25", 7)).toBe("2027-01-01");
    expect(dueDateIn("2026-11-01", null)).toBeNull();
  });

  it("checks emails loosely", () => {
    expect(looksLikeEmail("sara@northwind.co")).toBe(true);
    expect(looksLikeEmail("sara@northwind")).toBe(false);
  });
});
