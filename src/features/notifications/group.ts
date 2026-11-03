import type { NotificationRow } from "@/types/notifications";

export type FeedItem = { type: "header"; key: string; day: "today" | "yesterday" | "date"; date: string } | { type: "row"; key: string; row: NotificationRow };

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Pure: newest-first rows → a flat list with a day header before each new day ("Today", "Yesterday", then the
 * date). Flat so the list recycles cells; headers carry the date, the screen formats it.
 */
export function groupByDay(rows: NotificationRow[], now: Date = new Date()): FeedItem[] {
  const today = dayStart(now);
  const out: FeedItem[] = [];
  let current: number | null = null;
  for (const row of rows) {
    const d = new Date(row.created_at);
    const start = Number.isNaN(d.getTime()) ? 0 : dayStart(d);
    if (start !== current) {
      current = start;
      const diff = Math.round((today - start) / 86_400_000);
      out.push({ type: "header", key: `h-${start}`, day: diff === 0 ? "today" : diff === 1 ? "yesterday" : "date", date: row.created_at });
    }
    out.push({ type: "row", key: `n-${row.id}`, row });
  }
  return out;
}

/** The category a row belongs to (older rows keep it in metadata only). */
export function categoryOf(row: Pick<NotificationRow, "category" | "metadata" | "type">): string {
  return row.category ?? row.metadata?.category ?? (row.type === "lead_assigned" ? "assignment" : "system");
}
