import type { AiAgentAction, AiDraft } from "@/types/approvals";
import { api } from "./client";

/** AI SDR drafts waiting for a person. Backend routes/aiSdr.ts. */
export const draftsApi = {
  list: (baseId: number, signal?: AbortSignal) => api.get<{ pending_actions: AiDraft[] }>("/ai-sdr/pending-actions", { base_id: baseId, status: "pending" }, signal),
  get: (baseId: number, id: number, signal?: AbortSignal) => api.get<{ pending_action: AiDraft }>(`/ai-sdr/pending-actions/${id}`, { base_id: baseId }, signal),
  /** Drafts a person can approve (hand-offs to the inbox left out, as in the list). */
  count: (baseId: number, signal?: AbortSignal) =>
    api.get<{ count: number }>("/ai-sdr/pending-actions/count", { base_id: baseId, status: "pending", approvable: "true" }, signal).then((r) => r.count),
  /** Edited text only when it differs from the draft (the server then records "edited and approved"). */
  approve: (baseId: number, id: number, edited: { body?: string; subject?: string } = {}) =>
    api.post<{ pending_action: AiDraft }>(`/ai-sdr/pending-actions/${id}/approve`, { base_id: baseId, edited_body: edited.body, edited_subject: edited.subject }),
  reject: (baseId: number, id: number, reason?: string) => api.post<{ pending_action: AiDraft }>(`/ai-sdr/pending-actions/${id}/reject`, { base_id: baseId, reason: reason || undefined }),
};

/** AI agent actions waiting for approval. Backend routes/aiActions.ts. */
export const agentActionsApi = {
  list: (baseId: number, signal?: AbortSignal) => api.get<{ actions: AiAgentAction[] }>("/ai-actions", { base_id: baseId, status: "pending_approval", limit: 100 }, signal),
  count: (baseId: number, signal?: AbortSignal) => api.get<{ count: number }>("/ai-actions/pending-count", { base_id: baseId }, signal).then((r) => r.count),
  approve: (id: number) => api.post<{ action: AiAgentAction }>(`/ai-actions/${id}/approve`, {}),
  reject: (id: number) => api.post<{ action: AiAgentAction }>(`/ai-actions/${id}/reject`, {}),
};
