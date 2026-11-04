import type { InboxItem, InboxMessage } from "@/types/inbox";

/**
 * Pure: pages → one list without duplicates. The inbox pages by offset over a list that changes as messages
 * arrive, so the same conversation can appear on two pages; the first (newest) copy wins.
 */
export function mergePages(pages: { items: InboxItem[] }[]): InboxItem[] {
  const seen = new Set<string>();
  const out: InboxItem[] = [];
  for (const p of pages) {
    for (const it of p.items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

export type InboxGroup = "today" | "week" | "earlier";
export type InboxListEntry<T> = { kind: "header"; key: string; group: InboxGroup } | { kind: "row"; key: string; item: T; first: boolean; last: boolean };

/**
 * Pure: the list with a header before each group (today / this week / earlier, by last message), and each row
 * told whether it starts or ends its group (rows sit in one rounded card per group). Keeps the list order.
 */
export function groupByDay<T extends Pick<InboxItem, "id" | "last_message_at">>(items: T[], now: Date): InboxListEntry<T>[] {
  const today = new Date(now).setHours(0, 0, 0, 0);
  const weekAgo = today - 6 * 86_400_000;
  const groupOf = (it: T): InboxGroup => {
    const at = it.last_message_at ? Date.parse(it.last_message_at) : NaN;
    if (!Number.isFinite(at)) return "earlier";
    return at >= today ? "today" : at >= weekAgo ? "week" : "earlier";
  };
  const out: InboxListEntry<T>[] = [];
  items.forEach((it, i) => {
    const g = groupOf(it);
    const prev = i > 0 ? groupOf(items[i - 1]!) : null;
    const next = i < items.length - 1 ? groupOf(items[i + 1]!) : null;
    if (g !== prev) out.push({ kind: "header", key: `h-${g}-${it.id}`, group: g });
    out.push({ kind: "row", key: it.id, item: it, first: g !== prev, last: g !== next });
  });
  return out;
}

/** Pure: who to show for a conversation — the name, else the address, never empty. */
export function contactName(item: Pick<InboxItem, "contact_label" | "contact_email" | "contact_phone">): string {
  return item.contact_label?.trim() || item.contact_email || item.contact_phone || "Unknown";
}

/** Pure: the conversations waiting on you (unread), in list order, one per person, at most `max`. */
export function waitingOnYou<T extends Pick<InboxItem, "unread_count" | "contact_label" | "contact_email" | "contact_phone">>(items: T[], max = 10): T[] {
  const seen = new Set<string>();
  return items
    .filter((i) => {
      if (i.unread_count <= 0) return false;
      const who = contactName(i);
      if (seen.has(who)) return false;
      seen.add(who);
      return true;
    })
    .slice(0, max);
}

/**
 * Pure: preview without the backend's "You: " prefix (the app shows its own "You" marker). Campaign emails arrive
 * without the prefix, so `times` also marks it ours when the contact never wrote, or wrote before the last
 * message (a minute's slack: the two times come from different tables).
 */
export function splitPreview(preview: string | null, times?: { last_message_at: string | null; last_inbound_at: string | null }): { mine: boolean; text: string } {
  const p = (preview ?? "").trim();
  if (p.startsWith("You: ")) return { mine: true, text: p.slice(5) };
  return { mine: times ? sentLast(times.last_message_at, times.last_inbound_at) : false, text: p };
}

function sentLast(lastMessage: string | null, lastInbound: string | null): boolean {
  if (!lastMessage) return false;
  if (!lastInbound) return true;
  return Date.parse(lastMessage) - Date.parse(lastInbound) > 60_000;
}

export type ThreadRow = { type: "day"; key: string; date: string } | { type: "message"; key: string; message: InboxMessage; firstInGroup: boolean; lastInGroup: boolean };

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Pure: messages (oldest first) → rows with a day divider before each new day, and bubble grouping: messages
 * from the same side within 5 minutes stack tightly, like any modern chat.
 */
export function threadRows(messages: InboxMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let lastDay: Date | null = null;
  messages.forEach((m, i) => {
    const at = new Date(m.created_at);
    if (!lastDay || !sameDay(lastDay, at)) {
      rows.push({ type: "day", key: `d-${m.id}`, date: m.created_at });
      lastDay = at;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const close = (a?: InboxMessage, b?: InboxMessage) =>
      !!a && !!b && a.message_kind === "message" && b.message_kind === "message" && a.direction === b.direction && Math.abs(Date.parse(a.created_at) - Date.parse(b.created_at)) < 5 * 60_000 && sameDay(new Date(a.created_at), new Date(b.created_at));
    rows.push({ type: "message", key: m.id, message: m, firstInGroup: !close(prev, m), lastInGroup: !close(m, next) });
  });
  return rows;
}

/** Same test as the web inbox (InboxConversationFeed): real email markup, not "a < b" in plain text. */
const HTML_TAG = /<\/?(?:p|div|br|span|a|table|tr|td|th|tbody|thead|html|body|head|b|strong|i|em|u|ul|ol|li|h[1-6]|img|blockquote|font|center|hr|pre|code|style|meta)(?=[\s/>])[^>]*>/i;

/** Pure: the email's original HTML, if it has any (some mail sources put the HTML in the text field). */
export function originalHtml(m: Pick<InboxMessage, "body_html" | "body_text" | "message_kind">): string | null {
  if (m.message_kind === "activity") return null;
  const html = m.body_html?.trim();
  if (html) return html;
  const text = m.body_text?.trim() ?? "";
  return HTML_TAG.test(text) ? text : null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/** Pure: readable text for a bubble — markup stripped when the text field holds HTML. */
export function bubbleText(m: Pick<InboxMessage, "body_text" | "subject">): string {
  const text = (m.body_text ?? "").trim();
  if (!HTML_TAG.test(text)) return text || (m.subject ?? "");
  return text
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Pure: where the quoted earlier mail starts in a plain-text body ("On Wed, … wrote:", "-----Original Message-----",
 * "> …", a "-- " signature) — same rules as the web inbox (InboxConversationFeed quotedTextStart). -1 when none, or
 * when the whole body is a quote.
 */
export function quotedTextStart(text: string): number {
  const patterns = [
    /\n[^\n]{0,8}On [^\n]{6,240}(?:\n[^\n]{0,120})?wrote:\s*(\n|$)/,
    /\n--\s*\n/,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\n_{8,}\s*\nFrom: /,
    /\n>[^\n]*\n>/,
  ];
  let at = -1;
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && (at < 0 || m.index < at)) at = m.index;
  }
  return at > 0 ? at : -1;
}

/** Pure: the new part of an email and the quoted rest (null when there's no quote). */
export function splitQuote(text: string): { own: string; quote: string | null } {
  const at = quotedTextStart(text);
  if (at < 0) return { own: text, quote: null };
  return { own: text.slice(0, at).replace(/[\s\-_]+$/, ""), quote: text.slice(at).trim() };
}

/** Pure: "Assign to me" puts you first and keeps everyone already assigned (the server keeps up to 10). */
export function withMe(assignees: readonly number[], me: number | null | undefined): number[] {
  if (!me) return [...assignees];
  return [me, ...assignees.filter((id) => id !== me)].slice(0, 10);
}
