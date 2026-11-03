/**
 * The "new invoice" form's maths, mirroring the backend's invoiceRules (services/invoices/invoiceRules.ts) so the total
 * shown on the phone is the total the server saves. Pure — unit tested.
 */

/** Currencies with no minor unit (Stripe's list, same as the backend's). */
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export const MAX_LINES = 100;
export const MAX_TOTAL_CENTS = 99_999_999;

export function minorDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
}

/**
 * A typed amount as a plain "1250.5" string. Phones in many locales put "," on the decimal key, so:
 * with both "." and ",", the last one is the decimal point; a lone "," followed by 1–2 digits at the end
 * is a decimal point ("12,50"); any other "," groups thousands ("1,250").
 */
export function normalizeDecimal(input: string): string {
  const s = input.replace(/\s/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    return lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  }
  if (lastComma >= 0 && s.indexOf(",") === lastComma && /,\d{1,2}$/.test(s)) return s.replace(",", ".");
  return s.replace(/,/g, "");
}

/** "1,250.5" or "12,50" → cents for a 2-digit currency; null when it isn't a usable amount. */
export function parseAmount(input: string, currency: string): number | null {
  const s = normalizeDecimal(input);
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null;
  const minor = Math.round(Number(s) * 10 ** minorDigits(currency));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** "2" or "1.5" → a positive quantity; null otherwise. */
export function parseQuantity(input: string): number | null {
  const n = Number(input.replace(/,/g, "."));
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : null;
}

/** "5" → 500 basis points; empty is 0; null when outside 0–100%. */
export function parseTaxBps(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : null;
}

export type DraftLine = { key: string; name: string; quantity: string; price: string };

export type ParsedLine = { name: string; quantity: number; unit_price_cents: number };

/** Lines the user has started (a name or a price), parsed; `bad` marks lines that can't be saved yet. */
export function parseLines(lines: DraftLine[], currency: string): { lines: ParsedLine[]; bad: Set<string> } {
  const out: ParsedLine[] = [];
  const bad = new Set<string>();
  for (const l of lines) {
    if (!l.name.trim() && !l.price.trim()) continue;
    const quantity = parseQuantity(l.quantity || "1");
    const unit = parseAmount(l.price, currency);
    if (!l.name.trim() || quantity == null || unit == null) {
      bad.add(l.key);
      continue;
    }
    out.push({ name: l.name.trim(), quantity, unit_price_cents: unit });
  }
  return { lines: out, bad };
}

/** Subtotal, tax (rounded once, on the subtotal) and total — the backend's computeTotals. */
export function totals(lines: ParsedLine[], taxBps: number): { subtotal: number; tax: number; total: number } {
  const subtotal = lines.reduce((n, l) => n + Math.round(l.quantity * l.unit_price_cents), 0);
  const tax = Math.round((subtotal * taxBps) / 10_000);
  return { subtotal, tax, total: subtotal + tax };
}

/** "YYYY-MM-DD" `days` after `today` (a local "YYYY-MM-DD"); null for "on receipt". */
export function dueDateIn(today: string, days: number | null): string | null {
  if (days == null) return null;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A loose email check — the server has the final say; this only stops obvious typos. */
export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}
