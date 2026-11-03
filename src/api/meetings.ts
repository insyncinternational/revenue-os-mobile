import type { Meeting, MeetingPage, MeetingsSummary, MeetingView, OutcomeInput } from "@/types/calendar";
import { api } from "./client";

export const MEETINGS_PAGE = 30;

/**
 * Meetings (backend routes/meetings.ts). Changes send base_id in the query: the backend resolves the workspace
 * from the meeting and answers "not found" when it isn't the one the app is looking at.
 */
export const meetingsApi = {
  list: (baseId: number, view: MeetingView, offset: number, signal?: AbortSignal) =>
    api.get<MeetingPage>("/meetings", { base_id: baseId, view, limit: MEETINGS_PAGE, offset }, signal),
  /** Meetings starting in [from, to) — for the day strip (backend caps the window at 92 days). */
  range: (baseId: number, from: string, to: string, signal?: AbortSignal) =>
    api.get<{ meetings: Meeting[]; truncated: boolean }>("/meetings/calendar", { base_id: baseId, from, to }, signal),
  /** `dayEnd` = the end of the user's local day, so "today" matches what they see. */
  summary: (baseId: number, dayEnd: string, signal?: AbortSignal) => api.get<MeetingsSummary>("/meetings/summary", { base_id: baseId, day_end: dayEnd }, signal),
  get: (baseId: number, id: number, signal?: AbortSignal) => api.get<{ meeting: Meeting }>(`/meetings/${id}/detail`, { base_id: baseId }, signal),
  create: (baseId: number, body: { due_at: string; title?: string; lead_id?: number | null; join_url?: string | null; notes?: string | null }) =>
    api.post<{ meeting: Meeting }>("/meetings", { base_id: baseId, ...body }),
  outcome: (baseId: number, id: number, input: OutcomeInput) => api.post<{ meeting: Meeting }>(`/meetings/${id}/outcome`, input, { base_id: baseId }),
  reschedule: (baseId: number, id: number, dueAt: string) => api.post<{ meeting: Meeting }>(`/meetings/${id}/reschedule`, { due_at: dueAt }, { base_id: baseId }),
  cancel: (baseId: number, id: number) => api.post<{ meeting: Meeting }>(`/meetings/${id}/cancel`, {}, { base_id: baseId }),
  /** Back to scheduled (undo a recorded outcome). */
  reopen: (baseId: number, id: number) => api.post<{ meeting: Meeting }>(`/meetings/${id}/reopen`, {}, { base_id: baseId }),
};
