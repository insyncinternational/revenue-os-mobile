import { isOlderThan } from "./version";

describe("isOlderThan", () => {
  it("compares numerically, not as text", () => {
    expect(isOlderThan("1.2.10", "1.10.0")).toBe(true);
    expect(isOlderThan("1.10.0", "1.2.10")).toBe(false);
    expect(isOlderThan("1.0.0", "1.0.0")).toBe(false);
    expect(isOlderThan("1.0", "1.0.1")).toBe(true);
  });
  it("never blocks on unreadable versions", () => {
    expect(isOlderThan(undefined, "2.0.0")).toBe(false);
    expect(isOlderThan("1.0.0", "latest")).toBe(false);
  });
});
