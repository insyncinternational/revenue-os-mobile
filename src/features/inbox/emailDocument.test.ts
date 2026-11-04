import { emailDocument, hasRemoteImages, openableLink } from "./emailDocument";

const theme = { text: "#111111", link: "#f7820f", background: "#ffffff", dark: false };

describe("emailDocument", () => {
  it("puts a strict policy first: no script, no forms, images inline only by default", () => {
    const doc = emailDocument("<p>Hi</p><script>alert(1)</script>", theme, { remoteImages: false });
    const head = doc.slice(0, doc.indexOf("<body>"));
    expect(head.indexOf("Content-Security-Policy")).toBeLessThan(head.indexOf("<style>"));
    expect(head).toContain("default-src 'none'");
    expect(head).toContain("img-src data:;");
    expect(head).toContain("form-action 'none'");
    expect(head).not.toContain("script-src");
  });

  it("lets remote images in only when asked", () => {
    expect(emailDocument("", theme, { remoteImages: true })).toContain("img-src data: https: http:");
  });

  it("never lets a colour break out of the style block", () => {
    const doc = emailDocument("", { ...theme, text: "red;}</style><script>" }, { remoteImages: false });
    expect(doc).not.toContain("</style><script>");
    expect(doc).toContain("color:inherit");
  });

  it("knows when there are images to show", () => {
    expect(hasRemoteImages('<img src="https://t.example/p.gif">')).toBe(true);
    expect(hasRemoteImages('<div style="background:url(//x.example/a.png)">')).toBe(true);
    expect(hasRemoteImages('<img src="data:image/png;base64,AAA">')).toBe(false);
  });

  it("opens only web, mail and phone links", () => {
    expect(openableLink("https://example.com")).toBe(true);
    expect(openableLink("mailto:a@b.co")).toBe(true);
    expect(openableLink("javascript:alert(1)")).toBe(false);
    expect(openableLink("file:///etc/passwd")).toBe(false);
  });
});
