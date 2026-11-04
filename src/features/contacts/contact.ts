import type { Contact, ContactInput } from "@/types/contact";

/** Fields the app is allowed to send. PUT /leads/:id also runs PAID enrichment/scoring when it sees
 * `enrich: true` or `score: true` — those keys (and everything else) can never leave the app. */
const WRITABLE = ["first_name", "last_name", "email", "phone", "company", "role", "notes"] as const;

/** Pure: a whitelisted, trimmed body for create/update. Empty strings clear a field on update; omitted on create. */
export function contactPatch(input: Partial<ContactInput> & Record<string, unknown>, mode: "create" | "update"): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of WRITABLE) {
    const raw = input[key];
    if (raw === undefined) continue;
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) out[key] = key === "email" ? value.toLowerCase() : value;
    else if (mode === "update") out[key] = null;
  }
  return out;
}

export function fullName(c: Pick<Contact, "first_name" | "last_name" | "email" | "phone">): string {
  return [c.first_name, c.last_name].filter((s) => s && s.trim()).join(" ").trim() || c.email || c.phone || "Unnamed contact";
}

export function headline(c: Pick<Contact, "role" | "company">): string {
  return [c.role, c.company].filter((s) => s && s.trim()).join(" · ");
}

/** Pure: digits for tel:/sms:/WhatsApp links ("+971 50-123 4567" → "+971501234567"). Null when it can't be dialled. */
export function dialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return cleaned.replace(/\D/g, "").length >= 6 ? cleaned : null;
}

/** Pure: a wa.me link (no "+", digits only). */
export function whatsappLink(phone: string | null | undefined): string | null {
  const d = dialable(phone);
  return d ? `https://wa.me/${d.replace(/\D/g, "")}` : null;
}

/** Pure: the letter a name files under in the A–Z list: its first letter (any alphabet), or "#" for digits and symbols. */
export function letterOf(name: string): string {
  const ch = name.trim().charAt(0).toLocaleUpperCase();
  return /\p{L}/u.test(ch) ? ch : "#";
}

export type LetterRow<T> = { type: "letter"; key: string; letter: string } | { type: "contact"; key: string; contact: T };

/**
 * Pure: the A–Z list's rows: a letter heading before each run of names that file under it, and where those headings
 * sit (for sticky headers). The list arrives sorted by name, so each letter normally appears once; a name that
 * sorts oddly just starts a new run instead of breaking the list.
 */
export function withLetters<T extends { id: number }>(contacts: T[], nameOf: (c: T) => string): { rows: LetterRow<T>[]; headings: number[] } {
  const rows: LetterRow<T>[] = [];
  const headings: number[] = [];
  let last: string | null = null;
  for (const c of contacts) {
    const letter = letterOf(nameOf(c));
    if (letter !== last) {
      headings.push(rows.length);
      rows.push({ type: "letter", key: `letter-${letter}-${rows.length}`, letter });
      last = letter;
    }
    rows.push({ type: "contact", key: String(c.id), contact: c });
  }
  return { rows, headings };
}
