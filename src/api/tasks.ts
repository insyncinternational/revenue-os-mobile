import type { CrmTask, TaskPage } from "@/types/contact";
import { api } from "./client";

/** Enough for anyone's open list on a phone; the screen says so when there are more. */
export const TASKS_LIMIT = 200;

export type TaskQuery = { status: "pending" | "completed"; assigneeId: number | null };

/** CRM tasks without meetings (those live in Calendar). Backend routes/crm.ts. */
export const tasksApi = {
  list: (baseId: number, q: TaskQuery, signal?: AbortSignal) =>
    api.get<TaskPage>(
      "/crm/tasks",
      { base_id: baseId, status: q.status, assignee_id: q.assigneeId ?? undefined, exclude_type: "meeting", limit: TASKS_LIMIT },
      signal
    ),
  /** How many, without the rows (limit 1: the total comes back with the first page). */
  count: (baseId: number, q: TaskQuery, signal?: AbortSignal) =>
    api
      .get<TaskPage>("/crm/tasks", { base_id: baseId, status: q.status, assignee_id: q.assigneeId ?? undefined, exclude_type: "meeting", limit: 1 }, signal)
      .then((p) => p.total ?? 0),
  create: (baseId: number, body: Record<string, unknown>) => api.post<{ task: CrmTask }>("/crm/tasks", { base_id: baseId, ...body }),
  update: (baseId: number, id: number, body: Record<string, unknown>) => api.put<{ task: CrmTask }>(`/crm/tasks/${id}`, { base_id: baseId, ...body }),
  setStatus: (baseId: number, id: number, status: "completed" | "pending") => api.put<{ task: CrmTask }>(`/crm/tasks/${id}`, { base_id: baseId, status }),
};
