import type { InboxItem, InboxMessage } from "@/types/inbox";
import { bubbleText, contactName, groupByDay, mergePages, waitingOnYou, originalHtml, splitPreview, splitQuote, threadRows } from "./list";

const item = (id: string, extra: Partial<InboxItem> = {}) => ({ id, contact_label: id, ...extra }) as InboxItem;
const msg = (id: string, at: string, direction: "inbound" | "outbound" = "inbound", kind: "message" | "activity" = "message") =>
  ({ id, created_at: at, direction, message_kind: kind, body_text: id, body_html: null, from_label: null }) as InboxMessage;

describe("groupByDay", () => {
  it("adds a header per group and marks where each group starts and ends", () => {
    const now = new Date(2026, 10, 4, 15, 0);
    const at = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString();
    const rows = groupByDay([item("a", { last_message_at: at(4) }), item("b", { last_message_at: at(2) }), item("c", { last_message_at: at(1) }), item("d", { last_message_at: new Date(2026, 9, 20, 9).toISOString() })], now);
    expect(rows.map((r) => (r.kind === "header" ? r.group : `${r.key}${r.first ? "^" : ""}${r.last ? "$" : ""}`))).toEqual(["today", "a^$", "week", "b^", "c$", "earlier", "d^$"]);
  });
});

describe("mergePages", () => {
  it("keeps the first copy of a conversation that moved between pages", () => {
    expect(mergePages([{ items: [item("a"), item("b")] }, { items: [item("b"), item("c")] }]).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("contactName / splitPreview", () => {
  it("never shows an empty name", () => {
    expect(contactName({ contact_label: " ", contact_email: "x@y.co", contact_phone: null })).toBe("x@y.co");
    expect(contactName({ contact_label: "", contact_email: null, contact_phone: null })).toBe("Unknown");
  });
  it("strips the backend's You: prefix", () => {
    expect(splitPreview("You: See you then")).toEqual({ mine: true, text: "See you then" });
    expect(splitPreview("Sounds good")).toEqual({ mine: false, text: "Sounds good" });
    expect(splitPreview(null)).toEqual({ mine: false, text: "" });
  });
  it("marks campaign emails (no prefix) as ours when the contact hasn't written since", () => {
    const at = (last: string | null, inbound: string | null) => ({ last_message_at: last, last_inbound_at: inbound });
    // Never replied: our cold email.
    expect(splitPreview("Hi Test, quick question", at("2026-11-02T10:00:00Z", null)).mine).toBe(true);
    // They wrote last (same moment, or within a minute's slack).
    expect(splitPreview("Can I book?", at("2026-11-02T10:00:30Z", "2026-11-02T10:00:00Z")).mine).toBe(false);
    // We followed up after their reply.
    expect(splitPreview("See you then", at("2026-11-02T12:00:00Z", "2026-11-02T10:00:00Z")).mine).toBe(true);
  });
});

describe("threadRows", () => {
  it("adds day dividers and groups close messages from the same side", () => {
    const rows = threadRows([
      msg("1", "2026-10-30T10:00:00"),
      msg("2", "2026-10-30T10:02:00"),
      msg("3", "2026-10-30T10:03:00", "outbound"),
      msg("4", "2026-10-31T09:00:00", "outbound"),
      msg("5", "2026-10-31T09:01:00", "outbound", "activity"),
    ]);
    const shape = rows.map((r) => (r.type === "day" ? "day" : `${r.message.id}:${r.firstInGroup ? "F" : "-"}${r.lastInGroup ? "L" : "-"}`));
    expect(shape).toEqual(["day", "1:F-", "2:-L", "3:FL", "day", "4:FL", "5:FL"]);
  });
});

describe("email html", () => {
  const msg = (body_text: string | null, body_html: string | null = null) => ({ body_text, body_html, message_kind: "message" as const, subject: null });
  it("finds the original html in either field", () => {
    expect(originalHtml(msg("plain", "<p>Hi</p>"))).toBe("<p>Hi</p>");
    expect(originalHtml(msg("<div>Hi <b>there</b></div>"))).toBe("<div>Hi <b>there</b></div>");
    expect(originalHtml(msg("a < b and c > d"))).toBeNull();
    expect(originalHtml({ ...msg(null, "<p>x</p>"), message_kind: "activity" })).toBeNull();
  });
  it("shows readable text when the text field holds html", () => {
    expect(bubbleText(msg("<div>Hi &amp; welcome<br>See you</div><style>p{}</style>"))).toBe("Hi & welcome\nSee you");
    expect(bubbleText(msg("Plain text"))).toBe("Plain text");
  });
});

describe("quoted mail", () => {
  it("keeps only the new part and the quote apart", () => {
    const body = "Hi Sara, yes, we do catering for 40.\n\n---\nOn Fri, Oct 30, 2026, 10:09 PM,\nsara@example.com wrote:\n> Hi, can we talk?";
    const { own, quote } = splitQuote(body);
    expect(own).toBe("Hi Sara, yes, we do catering for 40.");
    expect(quote).toMatch(/^On Fri/);
  });
  it("leaves plain messages and quote-only bodies alone", () => {
    expect(splitQuote("Just a message")).toEqual({ own: "Just a message", quote: null });
    expect(splitQuote("> only a quote\n> here").quote).toBeNull();
  });
});

describe("waitingOnYou", () => {
  it("keeps unread conversations, one per person", () => {
    const list = [item("a", { unread_count: 2, contact_label: "Nina" }), item("b", { unread_count: 0, contact_label: "Omar" }), item("c", { unread_count: 1, contact_label: "Nina" }), item("d", { unread_count: 1, contact_label: "Sara" })];
    expect(waitingOnYou(list).map((i) => i.id)).toEqual(["a", "d"]);
    expect(waitingOnYou(list, 1)).toHaveLength(1);
  });
});
