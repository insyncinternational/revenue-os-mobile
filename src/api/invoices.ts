import type { Invoice, InvoiceInput, InvoiceList, InvoiceStatus, PaymentsStatus } from "@/types/invoice";
import { API_ORIGIN } from "./config";
import { api } from "./client";

/** The newest invoices a list loads; the screen says so when it is full. */
export const INVOICES_LIMIT = 200;

/** Invoices (backend routes/invoices.ts). A quick new invoice or one from a deal here; editing drafts stays on the web. */
export const invoicesApi = {
  /** A draft invoice; the server fills the customer's name and email from the contact when they're left out. */
  create: (baseId: number, body: InvoiceInput) => api.post<{ invoice: Invoice }>("/invoices", { base_id: baseId, ...body }),
  list: (baseId: number, status: InvoiceStatus | null, signal?: AbortSignal) =>
    api.get<InvoiceList>("/invoices", { base_id: baseId, status: status ?? undefined, limit: INVOICES_LIMIT }, signal),
  /** The totals only (draft / open / overdue / paid): limit 1, as the summary covers every invoice anyway. */
  summary: (baseId: number, signal?: AbortSignal) => api.get<InvoiceList>("/invoices", { base_id: baseId, limit: 1 }, signal).then((r) => r.summary),
  forDeal: (baseId: number, dealId: number, signal?: AbortSignal) => api.get<InvoiceList>("/invoices", { base_id: baseId, deal_id: dealId, limit: 20 }, signal),
  get: (baseId: number, id: number, signal?: AbortSignal) => api.get<{ invoice: Invoice }>(`/invoices/${id}`, { base_id: baseId }, signal),
  payments: (baseId: number, signal?: AbortSignal) => api.get<PaymentsStatus>("/invoices/payments", { base_id: baseId }, signal),
  /** "email" emails the customer; "link" only marks it sent so the pay link can be shared. */
  send: (baseId: number, id: number, deliver: "email" | "link") => api.post<{ invoice: Invoice }>(`/invoices/${id}/send`, { base_id: baseId, deliver }),
  markPaid: (baseId: number, id: number) => api.post<{ invoice: Invoice }>(`/invoices/${id}/mark-paid`, { base_id: baseId }),
  void: (baseId: number, id: number) => api.post<{ invoice: Invoice }>(`/invoices/${id}/void`, { base_id: baseId }),
  /** A draft invoice from a deal's products (or its amount), for the deal's contact. */
  fromDeal: (baseId: number, dealId: number) => api.post<{ invoice: Invoice }>("/invoices/from-deal", { base_id: baseId, deal_id: dealId }),
};

/**
 * The customer's PDF, through the public pay-link route (the token in the link is the credential), so the phone can
 * open it in the browser without a download library. Sent invoices only — a draft has no public page yet.
 */
export function invoicePdfUrl(invoice: Pick<Invoice, "pay_url">): string | null {
  const token = invoice.pay_url.match(/\/pay\/([A-Za-z0-9_-]{20,64})$/)?.[1];
  return token ? `${API_ORIGIN}/api/public/invoices/${token}/pdf` : null;
}
