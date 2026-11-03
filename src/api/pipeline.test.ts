import { numericAmount } from "./pipeline";

jest.mock("./client", () => ({ api: {} }));

describe("numericAmount", () => {
  it("turns a DECIMAL string into a number", () => {
    expect(numericAmount({ id: 1, amount: "12500.00" }).amount).toBe(12500);
  });
  it("keeps numbers and nulls as they are", () => {
    const deal = { id: 1, amount: 99 };
    expect(numericAmount(deal)).toBe(deal);
    expect(numericAmount({ id: 1, amount: null }).amount).toBeNull();
  });
  it("treats an unreadable amount as unknown", () => {
    expect(numericAmount({ id: 1, amount: "n/a" }).amount).toBeNull();
  });
});
