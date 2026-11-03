import { money } from "@/lib/format";
import { minorDigits } from "./draft";
import type { BadgeTone } from "@/ui/Badge";
import type { Invoice, InvoiceStatus } from "@/types/invoice";

/** Same colours as the web's invoice list. */
export const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = { draft: "neutral", sent: "info", overdue: "danger", paid: "success", void: "neutral" };

/** Minor units → the invoice's currency ("AED 1,250", "$12.50", "¥1,250"; JPY and the like have no cents). */
export function cents(amount: number, currency: string, locale: string, opts: { compact?: boolean } = {}): string {
  return money(amount / 10 ** minorDigits(currency), currency.toUpperCase(), locale, opts);
}

/** "AED 12,500 · $300" for per-currency totals; null when there's nothing. */
export function perCurrency(byCurrency: Record<string, number>, locale: string): string | null {
  const parts = Object.entries(byCurrency).filter(([, v]) => v > 0);
  return parts.length ? parts.map(([c, v]) => cents(v, c, locale, { compact: v >= 10_000_000 })).join(" · ") : null;
}

/** Pure: the paid share of everything invoiced (0–1), or null when nothing has been invoiced yet. */
export function paidShare(collected: number, outstanding: number): number | null {
  const total = Math.max(0, collected) + Math.max(0, outstanding);
  return total > 0 ? Math.max(0, collected) / total : null;
}

/** What's still to be paid. */
export function balanceDue(inv: Pick<Invoice, "total_cents" | "amount_paid_cents">): number {
  return Math.max(0, inv.total_cents - inv.amount_paid_cents);
}

/** What the user can do with an invoice in its current state (the backend's invoiceRules, mirrored). */
export function invoiceActions(inv: Pick<Invoice, "status" | "customer_email">): { send: boolean; email: boolean; share: boolean; markPaid: boolean; void: boolean; pdf: boolean } {
  const open = inv.status === "sent" || inv.status === "overdue";
  return {
    send: inv.status === "draft",
    // Emailing needs an address; resending works on open invoices too.
    email: (inv.status === "draft" || open) && Boolean(inv.customer_email),
    share: open,
    markPaid: open,
    void: inv.status === "draft" || open,
    // Drafts have no public page (and so no PDF link) until they're sent.
    pdf: inv.status !== "draft",
  };
}

/** Whole days past the due date (0 when not overdue). `today` is a local "YYYY-MM-DD". */
export function daysOverdue(inv: Pick<Invoice, "status" | "due_date">, today: string): number {
  if (inv.status !== "overdue" || !inv.due_date) return 0;
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${inv.due_date.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : 0;
}
