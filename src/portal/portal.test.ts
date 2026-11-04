import type { PortalInvoice, PortalMeeting } from "@/types/portal";
import { chronological, fileSize, messageText, normalizeBusinessCode, owed, slotsByDay, splitMeetings, unpaidInvoices } from "./portal";

const NOW = Date.parse("2026-11-04T12:00:00Z");
const meeting = (id: number, startsAt: string | null, status: PortalMeeting["status"] = "pending"): PortalMeeting => ({ id, title: `M${id}`, starts_at: startsAt, status, join_url: null });
const invoice = (id: number, over: Partial<PortalInvoice> = {}): PortalInvoice => ({
  id,
  number: `INV-${id}`,
  status: "open",
  currency: "aed",
  total_cents: 10000,
  amount_paid_cents: 0,
  due_date: null,
  paid_at: null,
  pay_url: "https://pay.example.test",
  ...over,
});

describe("normalizeBusinessCode", () => {
  it("turns what people type or paste into a slug", () => {
    expect(normalizeBusinessCode("  Bloom-Physio ")).toBe("bloom-physio");
    expect(normalizeBusinessCode("Hashmi Dental Clinic")).toBe("hashmi-dental-clinic");
    expect(normalizeBusinessCode("https://app.example.test/portal/hashmi-dental/verify?token=x")).toBe("hashmi-dental");
    expect(normalizeBusinessCode("--")).toBe("");
  });
});

describe("splitMeetings", () => {
  it("puts pending future ones first (soonest first) and the rest in past (newest first)", () => {
    const { upcoming, past } = splitMeetings(
      [meeting(1, "2026-11-06T10:00:00Z"), meeting(2, "2026-11-05T10:00:00Z"), meeting(3, "2026-11-01T10:00:00Z", "completed"), meeting(4, "2026-11-07T10:00:00Z", "cancelled"), meeting(5, "2026-11-03T10:00:00Z")],
      NOW
    );
    expect(upcoming.map((m) => m.id)).toEqual([2, 1]);
    expect(past.map((m) => m.id)).toEqual([4, 5, 3]);
  });

  it("keeps an appointment that started in the last hour in Coming up", () => {
    expect(splitMeetings([meeting(1, "2026-11-04T11:30:00Z")], NOW).upcoming).toHaveLength(1);
  });
});

describe("invoices", () => {
  it("works out what is owed and what to pay", () => {
    expect(owed(invoice(1, { amount_paid_cents: 2500 }))).toBe(7500);
    expect(owed(invoice(1, { amount_paid_cents: 20000 }))).toBe(0);
    const list = [invoice(1), invoice(2, { status: "paid", amount_paid_cents: 10000 }), invoice(3, { status: "void" }), invoice(4, { status: "draft" })];
    expect(unpaidInvoices(list).map((i) => i.id)).toEqual([1]);
  });
});

describe("messages and slots", () => {
  it("orders messages oldest first", () => {
    const m = (id: string, at: string) => ({ id, channel: "portal" as const, from: "customer" as const, subject: null, body: "", created_at: at });
    expect(chronological([m("b", "2026-11-02T00:00:00Z"), m("a", "2026-11-01T00:00:00Z")]).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("groups free slots by day, in order, skipping bad dates", () => {
    const days = slotsByDay(["2026-11-06T09:00:00", "2026-11-05T15:00:00", "nope", "2026-11-05T09:00:00"]);
    expect(days.map((d) => d.day)).toEqual(["2026-11-05", "2026-11-06"]);
    expect(days[0]?.slots).toEqual(["2026-11-05T09:00:00", "2026-11-05T15:00:00"]);
  });

  it("drops the trailing --- from email replies", () => {
    expect(messageText("See you then!\n\n---")).toBe("See you then!");
    expect(messageText("a - b")).toBe("a - b");
  });

  it("formats file sizes", () => {
    expect(fileSize(500)).toBe("500 B");
    expect(fileSize(2048)).toBe("2 KB");
    expect(fileSize(1572864)).toBe("1.5 MB");
  });
});
