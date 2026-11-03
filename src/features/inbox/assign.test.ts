import { withMe } from "./list";

describe("Assign to me", () => {
  it("adds me first and keeps the others", () => {
    expect(withMe([4, 9], 7)).toEqual([7, 4, 9]);
  });
  it("doesn't list me twice", () => {
    expect(withMe([4, 7], 7)).toEqual([7, 4]);
  });
  it("keeps the server's limit of 10", () => {
    expect(withMe([1, 2, 3, 4, 5, 6, 8, 9, 10, 11], 7)).toHaveLength(10);
  });
});
