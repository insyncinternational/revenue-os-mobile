import { firstNameOf, greetingKey } from "./greeting";

describe("greeting", () => {
  it("keeps a title with the name", () => {
    expect(firstNameOf("Dr. Hashmi")).toBe("Dr. Hashmi");
    expect(firstNameOf("Asad Shah")).toBe("Asad");
    expect(firstNameOf("")).toBe("");
    expect(firstNameOf(null)).toBe("");
  });
  it("picks the part of day", () => {
    expect(greetingKey(9)).toBe("today.greetingMorning");
    expect(greetingKey(14)).toBe("today.greetingAfternoon");
    expect(greetingKey(22)).toBe("today.greetingEvening");
  });
});
