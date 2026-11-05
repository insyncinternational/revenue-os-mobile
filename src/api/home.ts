import type { CallQueuePage, HomeData, MyDayPlan } from "@/types/home";
import { api } from "./client";

export const homeApi = {
  get: (baseId: number, sinceDays: number, signal?: AbortSignal) => api.get<HomeData>("/home", { base_id: baseId, since_days: sinceDays }, signal),
  /** People with a phone nobody has called yet (by a campaign, the dialler or call notes), best first. */
  callQueue: (baseId: number, limit: number, signal?: AbortSignal) => api.get<CallQueuePage>("/calls/queue", { base_id: baseId, limit }, signal),
  plan: (baseId: number, signal?: AbortSignal) => api.get<MyDayPlan>("/home/my-day/plan", { base_id: baseId }, signal),
  /** Marks a CRM task done (or back to pending, for Undo). */
  setTaskStatus: (baseId: number, taskId: number, status: "completed" | "pending") => api.put<unknown>(`/crm/tasks/${taskId}`, { base_id: baseId, status }),
};
