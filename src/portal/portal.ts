/** Pure customer-portal logic (unit tested). */
import type { PortalInvoice, PortalMeeting, PortalMessage } from "@/types/portal";

/** A typed business code → the portal slug ("Bloom Physio" / "bloom-physio " → "bloom-physio"). Also takes a pasted portal link. */
export function normalizeBusinessCode(input: string): string {
  const raw = input.trim();
  const fromLink = raw.match(/\/portal\/([A-Za-z0-9-]+)/)?.[1];
  const s = (fromLink ?? raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, 80);
}

/** Pure: upcoming (soonest first) and past (newest first) appointments. Cancelled ones go with the past. */
export function splitMeetings(meetings: readonly PortalMeeting[], now: number): { upcoming: PortalMeeting[]; past: PortalMeeting[] } {
  const at = (m: PortalMeeting) => (m.starts_at ? Date.parse(m.starts_at) : 0);
  const upcoming = meetings.filter((m) => m.status === "pending" && at(m) >= now - 60 * 60_000).sort((a, b) => at(a) - at(b));
  const past = meetings.filter((m) => !upcoming.includes(m)).sort((a, b) => at(b) - at(a));
  return { upcoming, past };
}

/** Pure: what is still owed on an invoice, in the smallest unit. */
export function owed(i: Pick<PortalInvoice, "total_cents" | "amount_paid_cents">): number {
  return Math.max(0, i.total_cents - i.amount_paid_cents);
}

/** Pure: invoices waiting for payment (not paid, not void, not draft). */
export function unpaidInvoices(invoices: readonly PortalInvoice[]): PortalInvoice[] {
  return invoices.filter((i) => owed(i) > 0 && !["paid", "void", "draft", "uncollectible"].includes(i.status));
}

/** Pure: messages oldest first (the conversation reads top to bottom). */
export function chronological(messages: readonly PortalMessage[]): PortalMessage[] {
  return [...messages].sort((a, b) => Date.parse(a.created_at ?? "0") - Date.parse(b.created_at ?? "0"));
}

/** Pure: a message's text without the trailing "---" separator email replies leave behind. */
export function messageText(body: string): string {
  return body.replace(/(\s*\n-{2,}\s*)+$/, "").trim();
}

/** Pure: free slots grouped by local day ("2026-11-05" → slots), days in order. */
export function slotsByDay(slots: readonly string[]): { day: string; slots: string[] }[] {
  const map = new Map<string, string[]>();
  for (const s of [...slots].sort()) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return [...map.entries()].map(([day, list]) => ({ day, slots: list }));
}

/** Pure: "1.2 MB" for a document's size. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
