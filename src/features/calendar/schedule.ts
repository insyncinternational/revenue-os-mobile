import { dayKey, daysBetween } from "@/lib/when";
import type { Meeting } from "@/types/calendar";

/** Same grace the backend uses before a meeting counts as "needs an outcome" (meetings.service GRACE_HOURS). */
const GRACE_MS = 2 * 3_600_000;
const SOON_MS = 30 * 60_000;

/**
 * Pure: where a meeting stands right now — drives its badge and which actions the screen offers.
 *  soon: starts within 30 min · now: started, inside the 2 h grace · needs_outcome: over, nothing recorded.
 */
export type MeetingPhase = "upcoming" | "soon" | "now" | "needs_outcome" | "attended" | "no_show" | "cancelled";

export function meetingPhase(m: Pick<Meeting, "status" | "due_at" | "outcome">, now: number): MeetingPhase {
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "completed") return m.outcome === "no_show" ? "no_show" : "attended";
  const at = m.due_at ? Date.parse(m.due_at) : NaN;
  if (!Number.isFinite(at)) return "upcoming";
  if (now < at - SOON_MS) return "upcoming";
  if (now < at) return "soon";
  if (now < at + GRACE_MS) return "now";
  return "needs_outcome";
}

/** Join is offered from 30 minutes before until the grace ends (before that, the link is in the details). */
export function canJoin(m: Pick<Meeting, "status" | "due_at" | "outcome" | "join_url">, now: number): boolean {
  const phase = meetingPhase(m, now);
  return Boolean(m.join_url) && (phase === "soon" || phase === "now");
}

export type AgendaItem = { type: "header"; key: string; day: "today" | "tomorrow" | "yesterday" | "date"; date: string } | { type: "row"; key: string; meeting: Meeting };

/** Pure: meetings in list order → a flat list with a header before each new local day. */
export function agenda(meetings: Meeting[], now: Date): AgendaItem[] {
  const out: AgendaItem[] = [];
  let current: string | null = null;
  for (const m of meetings) {
    const d = m.due_at ? new Date(m.due_at) : null;
    const key = d && !Number.isNaN(d.getTime()) ? dayKey(d) : "none";
    if (key !== current) {
      current = key;
      const diff = d ? daysBetween(now, d) : NaN;
      out.push({
        type: "header",
        key: `h-${key}`,
        day: diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff === -1 ? "yesterday" : "date",
        date: m.due_at ?? "",
      });
    }
    out.push({ type: "row", key: `m-${m.id}`, meeting: m });
  }
  return out;
}

/** Pure: how many (not cancelled) meetings fall on each local day — the dots on the day strip. */
export function countByDay(meetings: Pick<Meeting, "due_at" | "status">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of meetings) {
    if (!m.due_at || m.status === "cancelled") continue;
    const d = new Date(m.due_at);
    if (Number.isNaN(d.getTime())) continue;
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Who the meeting is with, for rows and titles. */
export function meetingWith(m: Pick<Meeting, "contact_name" | "company">): string | null {
  return [m.contact_name, m.company].filter(Boolean).join(" · ") || null;
}
