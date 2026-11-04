import { scoreTone } from "./scoreTone";

describe("scoreTone", () => {
  it("is red below 40, amber below 70 and green from 70", () => {
    expect(scoreTone(0)).toBe("danger");
    expect(scoreTone(39)).toBe("danger");
    expect(scoreTone(40)).toBe("warning");
    expect(scoreTone(69)).toBe("warning");
    expect(scoreTone(70)).toBe("success");
    expect(scoreTone(100)).toBe("success");
  });
});
