import type { CrmTask, TimelineItem } from "@/types/contact";
import type { Board, CrmBootstrap, Deal, Pipeline } from "@/types/pipeline";
import { api } from "./client";

/** Deal amounts are SQL DECIMALs and arrive as strings ("12500.00"); the app works with numbers. */
export function numericAmount<T extends { amount: number | string | null }>(deal: T): T {
  if (typeof deal.amount !== "string") return deal;
  const n = Number(deal.amount);
  return { ...deal, amount: Number.isFinite(n) ? n : null };
}

const oneDeal = (r: { deal: Deal }) => ({ ...r, deal: numericAmount(r.deal) });

export const pipelineApi = {
  /** Stages, lost reasons, members, default currency (creates the default pipeline when a workspace has none). */
  bootstrap: (baseId: number, pipelineId: number | null, signal?: AbortSignal) =>
    api.get<CrmBootstrap>("/crm/bootstrap", { base_id: baseId, pipeline_id: pipelineId ?? undefined }, signal),
  pipelines: (baseId: number, signal?: AbortSignal) => api.get<{ pipelines: Pipeline[] }>("/crm/pipelines", { base_id: baseId }, signal),
  board: (baseId: number, pipelineId: number | null, ownerId: number | null, signal?: AbortSignal) =>
    api
      .get<Board>("/crm/pipeline", { base_id: baseId, pipeline_id: pipelineId ?? undefined, owner_id: ownerId ?? undefined }, signal)
      .then((b) => ({ ...b, dealsByStage: Object.fromEntries(Object.entries(b.dealsByStage).map(([k, list]) => [k, list.map(numericAmount)])) })),
  deal: (baseId: number, id: number, signal?: AbortSignal) => api.get<{ deal: Deal }>(`/crm/deals/${id}`, { base_id: baseId }, signal).then(oneDeal),
  create: (baseId: number, body: Record<string, unknown>) => api.post<{ deal: Deal }>("/crm/deals", { base_id: baseId, ...body }).then(oneDeal),
  update: (baseId: number, id: number, body: Record<string, unknown>) => api.put<{ deal: Deal }>(`/crm/deals/${id}`, { base_id: baseId, ...body }).then(oneDeal),
  moveStage: (baseId: number, id: number, stageId: number, lostReason?: string) =>
    api.patch<{ deal: Deal }>(`/crm/deals/${id}/stage`, { base_id: baseId, stage_id: stageId, ...(lostReason ? { lost_reason: lostReason } : {}) }).then(oneDeal),
  timeline: (baseId: number, dealId: number, signal?: AbortSignal) => api.get<{ timeline: TimelineItem[] }>("/crm/timeline", { base_id: baseId, deal_id: dealId, limit: 50 }, signal),
  tasks: (baseId: number, dealId: number, signal?: AbortSignal) => api.get<{ tasks: CrmTask[] }>("/crm/tasks", { base_id: baseId, deal_id: dealId, status: "pending", limit: 50 }, signal),
  addNote: (baseId: number, dealId: number, body: string) => api.post<unknown>("/crm/activities", { base_id: baseId, type: "note", body, deal_id: dealId }),
};
