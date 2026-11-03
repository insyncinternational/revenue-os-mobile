import { invoicePdfUrl } from "@/api/invoices";
import { balanceDue, cents, daysOverdue, invoiceActions, paidShare, perCurrency } from "./invoice";

jest.mock("@/api/client", () => ({ api: {} }));

describe("invoices", () => {
  it("shows zero-decimal currencies without dividing by 100", () => {
    expect(cents(1_250, "jpy", "en-US")).toContain("1,250");
  });

  it("formats cents in the invoice's currency", () => {
    expect(cents(1_250_000, "usd", "en-US")).toBe("$12,500");
    expect(cents(1250, "usd", "en-US")).toBe("$12.50");
  });

  it("joins totals per currency and skips zeros", () => {
    expect(perCurrency({ usd: 30_000, eur: 0 }, "en-US")).toBe("$300");
    expect(perCurrency({}, "en-US")).toBeNull();
  });

  it("knows what's left to pay", () => {
    expect(balanceDue({ total_cents: 10_000, amount_paid_cents: 2_500 })).toBe(7_500);
    expect(balanceDue({ total_cents: 10_000, amount_paid_cents: 12_000 })).toBe(0);
  });

  it("offers only the actions the backend allows", () => {
    expect(invoiceActions({ status: "draft", customer_email: null })).toEqual({ send: true, email: false, share: false, markPaid: false, void: true, pdf: false });
    expect(invoiceActions({ status: "overdue", customer_email: "a@b.co" })).toEqual({ send: false, email: true, share: true, markPaid: true, void: true, pdf: true });
    expect(invoiceActions({ status: "paid", customer_email: "a@b.co" })).toEqual({ send: false, email: false, share: false, markPaid: false, void: false, pdf: true });
  });

  it("counts days overdue", () => {
    expect(daysOverdue({ status: "overdue", due_date: "2026-10-28" }, "2026-11-01")).toBe(4);
    expect(daysOverdue({ status: "sent", due_date: "2026-10-28" }, "2026-11-01")).toBe(0);
  });

  it("builds the public PDF link from the pay link, never from anything else", () => {
    expect(invoicePdfUrl({ pay_url: "https://cafe.agency.example/pay/abcdefghijklmnopqrstuvwx" })).toMatch(/\/api\/public\/invoices\/abcdefghijklmnopqrstuvwx\/pdf$/);
    expect(invoicePdfUrl({ pay_url: "https://x.example/pay/short" })).toBeNull();
  });
});

describe("paidShare", () => {
  it("is the paid part of everything invoiced", () => {
    expect(paidShare(120_803, 0)).toBe(1);
    expect(paidShare(300, 100)).toBe(0.75);
    // Nothing invoiced yet: no bar at all.
    expect(paidShare(0, 0)).toBeNull();
  });
});
