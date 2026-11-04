import { passwordStrength } from "./password";

describe("passwordStrength", () => {
  it("is 0 for nothing and at least 1 once something is typed", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
  });
  it("rises with length and variety", () => {
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("abcdefgh1A")).toBe(2);
    expect(passwordStrength("abcdefgh1A2b")).toBe(3);
    expect(passwordStrength("Abcdefgh1!xyz")).toBe(4);
  });
});
