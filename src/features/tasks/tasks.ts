import { daysBetween } from "@/lib/when";
import type { CrmTask, TaskInput } from "@/types/contact";

/** The sections of the Tasks list, in the order they show. */
export const BUCKETS = ["overdue", "today", "tomorrow", "week", "later", "none"] as const;
export type Bucket = (typeof BUCKETS)[number];

/** Pure: which section an open task belongs to. Overdue = its time has passed (same rule as the web). */
export function bucketOf(task: Pick<CrmTask, "due_at">, now: Date): Bucket {
  const at = task.due_at ? new Date(task.due_at) : null;
  if (!at || Number.isNaN(at.getTime())) return "none";
  if (at.getTime() < now.getTime()) return "overdue";
  const days = daysBetween(now, at);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return "week";
  return "later";
}

export type TaskItem = { type: "header"; key: string; bucket: Bucket | "done"; count: number } | { type: "row"; key: string; task: CrmTask; bucket: Bucket | "done" };

/** Pure: open tasks → sections in a fixed order (each sorted by due time), empty sections left out. */
export function groupTasks(tasks: CrmTask[], now: Date): TaskItem[] {
  const by = new Map<Bucket, CrmTask[]>();
  for (const t of tasks) {
    const b = bucketOf(t, now);
    by.set(b, [...(by.get(b) ?? []), t]);
  }
  const due = (t: CrmTask) => (t.due_at ? Date.parse(t.due_at) : Number.POSITIVE_INFINITY);
  return BUCKETS.flatMap((bucket) => {
    const list = (by.get(bucket) ?? []).sort((a, b) => due(a) - due(b) || b.id - a.id);
    if (!list.length) return [];
    return [{ type: "header" as const, key: `h-${bucket}`, bucket, count: list.length }, ...list.map((task) => ({ type: "row" as const, key: `t-${task.id}`, task, bucket }))];
  });
}

/** Pure: finished tasks, most recently finished first, under one header. */
export function groupDone(tasks: CrmTask[]): TaskItem[] {
  if (!tasks.length) return [];
  const when = (t: CrmTask) => Date.parse(t.completed_at ?? t.due_at ?? "") || 0;
  const list = [...tasks].sort((a, b) => when(b) - when(a) || b.id - a.id);
  return [{ type: "header", key: "h-done", bucket: "done", count: list.length }, ...list.map((task) => ({ type: "row" as const, key: `t-${task.id}`, task, bucket: "done" as const }))];
}

/** "Sara Ahmed" / "Northwind Events" — who a task is about. */
export function taskContact(task: Pick<CrmTask, "lead">): string | null {
  const l = task.lead;
  if (!l) return null;
  return [l.first_name, l.last_name].filter(Boolean).join(" ") || l.company || null;
}

/**
 * Pure: form → request body. Only the fields the app edits are ever sent. The API drops a null due date (it
 * can't clear one), and on create a description must be left out rather than null.
 */
export function taskBody(input: TaskInput, mode: "create" | "edit"): { ok: true; body: Record<string, unknown> } | { ok: false } {
  const title = input.title.trim();
  if (!title) return { ok: false };
  const description = input.description.trim();
  const body: Record<string, unknown> = {
    title: title.slice(0, 512),
    task_type: input.task_type,
    priority: input.priority,
    lead_id: input.lead_id,
    deal_id: input.deal_id,
  };
  if (input.due_at) body.due_at = input.due_at;
  if (description) body.description = description.slice(0, 5000);
  else if (mode === "edit") body.description = null;
  return { ok: true, body };
}
