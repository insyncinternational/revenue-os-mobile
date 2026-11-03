import { addWithinLimits, base64Bytes, formatBytes, MAX_ATTACHMENT_BYTES, totalBytes, type ReplyAttachment } from "./attachments";

jest.mock("expo-image-picker", () => ({}));

const att = (size: number, key = String(size)): ReplyAttachment => ({ key, filename: `${key}.jpg`, content_base64: "", size });

describe("reply attachments", () => {
  it("measures base64 content", () => {
    expect(base64Bytes("aGVsbG8=")).toBe(5); // "hello"
    expect(base64Bytes("aGk=")).toBe(2); // "hi"
    expect(base64Bytes("YWJj")).toBe(3); // "abc"
  });

  it("formats sizes", () => {
    expect(formatBytes(2.4 * 1024 * 1024, "en-US")).toBe("2.4 MB");
    expect(formatBytes(830 * 1024, "en-US")).toBe("830 KB");
    expect(formatBytes(10, "en-US")).toBe("1 KB");
  });

  it("adds what fits under 7 MB and 10 files", () => {
    const four = 4 * 1024 * 1024;
    const r = addWithinLimits([att(four, "a")], [att(four, "b"), att(1024, "c")]);
    expect(r.list.map((a) => a.key)).toEqual(["a", "c"]);
    expect(r.dropped).toBe(true);
    expect(totalBytes(r.list)).toBeLessThanOrEqual(MAX_ATTACHMENT_BYTES);

    const many = addWithinLimits([], Array.from({ length: 12 }, (_, i) => att(10, `f${i}`)));
    expect(many.list).toHaveLength(10);
    expect(many.dropped).toBe(true);
  });
});
