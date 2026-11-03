/** Invoices (backend routes/invoices.ts, services/invoices/invoices.service.ts invoiceView). Money is in cents. */

/** "sent" shows as Open; a sent invoice past its due date comes back as "overdue". */
export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "void";

export type InvoiceItem = { id: number; name: string; description: string | null; quantity: number; unit_price_cents: number; amount_cents: number };

export type Invoice = {
  id: number;
  number: string;
  status: InvoiceStatus;
  stored_status: string;
  lead_id: number | null;
  deal_id: number | null;
  currency: string;
  subtotal_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  customer_name: string | null;
  customer_email: string | null;
  notes: string | null;
  due_date: string | null;
  /** The customer's pay page, on the client's own (agency) address. */
  pay_url: string;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_at: string | null;
  items: InvoiceItem[];
};

export type InvoiceSummary = {
  draft: number;
  open: number;
  overdue: number;
  paid: number;
  /** Per currency, in cents. */
  outstanding: Record<string, number>;
  collected: Record<string, number>;
};

export type InvoiceList = { invoices: Invoice[]; summary: InvoiceSummary };

/** GET /api/invoices/payments — sending needs Stripe connected with charges enabled. */
export type PaymentsStatus = { stripe_configured: boolean; connected: boolean; charges_enabled: boolean; default_currency: string | null };

/** POST /api/invoices — what the phone's quick form sends. */
export type InvoiceInput = {
  lead_id?: number | null;
  currency: string;
  tax_rate_bps?: number;
  customer_name?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  due_date?: string | null;
  items: { name: string; quantity: number; unit_price_cents: number }[];
};
