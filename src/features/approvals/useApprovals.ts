import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { agentActionsApi, draftsApi } from "@/api/approvals";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useActiveBaseId, useCan, useModuleEnabled } from "@/session/workspace";
import type { AiAgentAction, AiDraft } from "@/types/approvals";
import { useCelebrate } from "@/ui/Celebrate";
import { useToast } from "@/ui/Toast";
import { isApprovable } from "./approvals";

/** May this user see AI SDR drafts here (module on, permission granted)? */
export function useDraftsVisible(): boolean {
  const moduleOn = useModuleEnabled("ai_sdr");
  const allowed = useCan("ai_drafts_read");
  return moduleOn && allowed;
}

export function useDrafts(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.approvals.drafts(baseId),
    queryFn: ({ signal }) => draftsApi.list(baseId, signal),
    enabled: enabled && baseId > 0,
    staleTime: 30_000,
    // Hand-offs are in the list too; they're answered in the inbox, not approved.
    select: (r) => r.pending_actions.filter(isApprovable),
  });
}

export function useAgentActions(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.approvals.actions(baseId),
    queryFn: ({ signal }) => agentActionsApi.list(baseId, signal),
    enabled: enabled && baseId > 0,
    staleTime: 30_000,
    select: (r) => r.actions,
  });
}

/** Everything waiting, for the More row and Today: two counts, not the two lists. */
export function useApprovalCount(): number {
  const baseId = useActiveBaseId() ?? 0;
  const draftsOn = useDraftsVisible();
  const counts = useQuery({
    queryKey: [...keys.approvals.count(baseId), draftsOn],
    queryFn: async ({ signal }) => {
      const [drafts, actions] = await Promise.all([draftsOn ? draftsApi.count(baseId, signal) : Promise.resolve(0), agentActionsApi.count(baseId, signal)]);
      return { drafts, actions };
    },
    enabled: baseId > 0,
    staleTime: 30_000,
  }).data;
  return (draftsOn ? (counts?.drafts ?? 0) : 0) + (counts?.actions ?? 0);
}

export function useDraft(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useQuery<AiDraft>({
    queryKey: keys.approvals.draft(baseId, id),
    queryFn: ({ signal }) => draftsApi.get(baseId, id, signal).then((r) => r.pending_action),
    enabled: baseId > 0 && id > 0,
    // Opened from the list: show it at once while the full copy loads.
    placeholderData: () => qc.getQueryData<{ pending_actions: AiDraft[] }>(keys.approvals.drafts(baseId))?.pending_actions.find((d) => d.id === id),
  });
}

function removeFromList<T extends { id: number }>(qc: QueryClient, key: readonly unknown[], field: string, id: number) {
  qc.setQueryData<Record<string, T[]>>(key, (page) => (page?.[field] ? { ...page, [field]: page[field]!.filter((x) => x.id !== id) } : page));
}

/** Approve (optionally edited) or reject a draft. The row leaves the list at once and comes back if refused. */
export function useDecideDraft() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  return useMutation({
    mutationFn: (v: { id: number; kind: "approve"; edited?: { body?: string; subject?: string } } | { id: number; kind: "reject"; reason?: string }) =>
      v.kind === "approve" ? draftsApi.approve(baseId, v.id, v.edited) : draftsApi.reject(baseId, v.id, v.reason),
    onMutate: async ({ id }) => {
      const key = keys.approvals.drafts(baseId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData(key);
      removeFromList<AiDraft>(qc, key, "pending_actions", id);
      return { snapshot };
    },
    onSuccess: (r, v) => {
      // Approved but the send itself failed: the draft is still worth a look on the web.
      const failed = r.pending_action.status === "failed";
      // A small burst when the AI's reply went out (not for a reject, nor a failed send).
      if (v.kind === "approve" && !failed) {
        haptics.success();
        celebrate();
      }
      toast.show(failed ? t("approvals.sendFailed") : v.kind === "approve" ? t("approvals.approved") : t("approvals.rejected"), { kind: failed ? "error" : "success" });
    },
    onError: async (e, v, ctx) => {
      // The server approves, then tries to send; a failed send answers with an error but the draft is decided
      // (status "failed", with the reason). Only a draft still pending goes back in the list.
      const now = await draftsApi.get(baseId, v.id).then((r) => r.pending_action, () => null);
      if (now && now.status !== "pending") {
        qc.setQueryData(keys.approvals.draft(baseId, v.id), now);
        toast.show(now.error_message ? t("approvals.sendFailedReason", { reason: now.error_message }) : t("approvals.sendFailed"), { kind: "error" });
        return;
      }
      if (ctx?.snapshot) qc.setQueryData(keys.approvals.drafts(baseId), ctx.snapshot);
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: () => {
      // Includes the draft itself, so its screen shows the outcome (sent, rejected or failed with why).
      void qc.invalidateQueries({ queryKey: keys.approvals.all(baseId) });
      void qc.invalidateQueries({ queryKey: ["home", baseId] });
      void qc.invalidateQueries({ queryKey: keys.inbox.all(baseId) });
    },
  });
}

/** Approve or reject an agent action, same optimistic behaviour. */
export function useDecideAction() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ action, kind }: { action: AiAgentAction; kind: "approve" | "reject" }) => (kind === "approve" ? agentActionsApi.approve(action.id) : agentActionsApi.reject(action.id)),
    onMutate: async ({ action }) => {
      const key = keys.approvals.actions(baseId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData(key);
      removeFromList<AiAgentAction>(qc, key, "actions", action.id);
      return { snapshot };
    },
    onSuccess: (r, { kind }) => {
      if (kind === "approve") haptics.success();
      const failed = r.action.status === "failed";
      toast.show(failed ? r.action.error || t("approvals.actionFailed") : kind === "approve" ? t("approvals.approved") : t("approvals.rejected"), { kind: failed ? "error" : "success" });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(keys.approvals.actions(baseId), ctx.snapshot);
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.approvals.all(baseId) });
      void qc.invalidateQueries({ queryKey: ["home", baseId] });
    },
  });
}
