import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { pipelineApi } from "@/api/pipeline";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { storage } from "@/lib/storage";
import { keys } from "@/query/keys";
import { useActiveBaseId } from "@/session/workspace";
import type { Board, Deal, Stage } from "@/types/pipeline";
import { useCelebrate } from "@/ui/Celebrate";
import { useToast } from "@/ui/Toast";

const pipelineKey = (baseId: number) => `pref.pipeline.${baseId}`;

/**
 * The chosen pipeline is shared: the board and the picker sheet (a separate screen) both read it, so
 * choosing in the sheet redraws the board behind it. Saved per workspace in storage; this only tells
 * every reader to look again.
 */
let choiceVersion = 0;
const choiceListeners = new Set<() => void>();
function subscribeChoice(listener: () => void): () => void {
  choiceListeners.add(listener);
  return () => {
    choiceListeners.delete(listener);
  };
}
const readChoiceVersion = () => choiceVersion;

/** The chosen pipeline (remembered per workspace), its stages, lost reasons and currency, and the board. */
export function usePipelineBoard() {
  const baseId = useActiveBaseId() ?? 0;
  // Remembered per workspace: switching workspace never carries the previous workspace's pipeline over.
  useSyncExternalStore(subscribeChoice, readChoiceVersion, readChoiceVersion);
  const pipelineId = storage.getNumber(pipelineKey(baseId)) ?? null;
  const choose = (id: number) => {
    storage.set(pipelineKey(baseId), id);
    choiceVersion += 1;
    choiceListeners.forEach((l) => l());
  };
  const enabled = baseId > 0;
  const pipelines = useQuery({ queryKey: keys.pipeline.pipelines(baseId), queryFn: ({ signal }) => pipelineApi.pipelines(baseId, signal), enabled, staleTime: 5 * 60_000 });
  const bootstrap = useQuery({ queryKey: [...keys.pipeline.bootstrap(baseId), pipelineId], queryFn: ({ signal }) => pipelineApi.bootstrap(baseId, pipelineId, signal), enabled, staleTime: 5 * 60_000 });
  const board = useQuery({
    queryKey: keys.pipeline.board(baseId, pipelineId),
    queryFn: ({ signal }) => pipelineApi.board(baseId, pipelineId, null, signal),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  return { baseId, pipelineId: board.data?.pipeline_id ?? pipelineId, choose, pipelines, bootstrap, board };
}

/** Moves a deal's card to its new stage in the cached board (and its totals), returning the previous board. */
function moveInBoard(qc: QueryClient, baseId: number, deal: Deal, to: Stage): [readonly unknown[], Board | undefined][] {
  const snapshot = qc.getQueriesData<Board>({ queryKey: ["pipeline", baseId, "board"] });
  qc.setQueriesData<Board>({ queryKey: ["pipeline", baseId, "board"] }, (b) => {
    if (!b) return b;
    const from = String(deal.stage_id);
    const fromList = (b.dealsByStage[from] ?? []).filter((d) => d.id !== deal.id);
    const moved: Deal = { ...deal, stage_id: to.id, stage: to, status: to.is_won ? "won" : to.is_lost ? "lost" : "open", stage_entered_at: new Date().toISOString() };
    const toList = [moved, ...(b.dealsByStage[String(to.id)] ?? []).filter((d) => d.id !== deal.id)];
    const totals = { ...b.stage_totals };
    const amt = deal.amount ?? 0;
    const bump = (sid: string, n: number) => {
      const cur = totals[sid] ?? { count: 0, value: 0, weighted_value: 0, shown: 0 };
      totals[sid] = { ...cur, count: Math.max(0, cur.count + n), value: Math.max(0, cur.value + n * amt), shown: Math.max(0, cur.shown + n) };
    };
    bump(from, -1);
    bump(String(to.id), 1);
    return { ...b, dealsByStage: { ...b.dealsByStage, [from]: fromList, [String(to.id)]: toList }, stage_totals: totals };
  });
  return snapshot;
}

/** Move a deal: instant on the board, rolled back if the server refuses. Won gets a celebratory haptic. */
export function useMoveDeal() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  return useMutation({
    mutationFn: ({ deal, to, lostReason }: { deal: Deal; to: Stage; lostReason?: string }) => pipelineApi.moveStage(baseId, deal.id, to.id, lostReason),
    onMutate: async ({ deal, to }) => {
      await qc.cancelQueries({ queryKey: ["pipeline", baseId, "board"] });
      const snapshot = moveInBoard(qc, baseId, deal, to);
      qc.setQueryData<{ deal: Deal }>(keys.pipeline.deal(baseId, deal.id), (d) => (d ? { deal: { ...d.deal, stage_id: to.id, stage: to, status: to.is_won ? "won" : to.is_lost ? "lost" : "open" } } : d));
      if (to.is_won) haptics.success();
      else haptics.light();
      return { snapshot };
    },
    onSuccess: (_r, { to }) => {
      if (to.is_won) celebrate();
      toast.show(to.is_won ? t("pipeline.wonToast") : to.is_lost ? t("pipeline.lostToast") : t("pipeline.movedToast", { stage: to.name }), { kind: to.is_lost ? "info" : "success" });
    },
    onError: (e, { deal }, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      void qc.invalidateQueries({ queryKey: keys.pipeline.deal(baseId, deal.id) });
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: (_r, _e, { deal }) => {
      void qc.invalidateQueries({ queryKey: ["pipeline", baseId, "board"] });
      void qc.invalidateQueries({ queryKey: keys.pipeline.deal(baseId, deal.id) });
      // The server logs "Moved to …" on the deal's timeline; the contact's deal list shows the stage.
      void qc.invalidateQueries({ queryKey: keys.pipeline.dealTimeline(baseId, deal.id) });
      if (deal.lead_id) void qc.invalidateQueries({ queryKey: keys.contacts.deals(baseId, deal.lead_id) });
      void qc.invalidateQueries({ queryKey: ["home", baseId] });
    },
  });
}

export function useDeal(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const enabled = baseId > 0 && id > 0;
  const deal = useQuery({ queryKey: keys.pipeline.deal(baseId, id), queryFn: ({ signal }) => pipelineApi.deal(baseId, id, signal), enabled, staleTime: 30_000 });
  const timeline = useQuery({ queryKey: keys.pipeline.dealTimeline(baseId, id), queryFn: ({ signal }) => pipelineApi.timeline(baseId, id, signal), enabled, staleTime: 30_000, meta: { persist: false } });
  const tasks = useQuery({ queryKey: keys.pipeline.dealTasks(baseId, id), queryFn: ({ signal }) => pipelineApi.tasks(baseId, id, signal), enabled, staleTime: 30_000, meta: { persist: false } });
  return { deal, timeline, tasks };
}

export function useSaveDeal(id: number | null) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => (id ? pipelineApi.update(baseId, id, body) : pipelineApi.create(baseId, body)),
    onSuccess: ({ deal }) => {
      haptics.success();
      qc.setQueryData(keys.pipeline.deal(baseId, deal.id), { deal });
      void qc.invalidateQueries({ queryKey: keys.pipeline.dealTimeline(baseId, deal.id) });
      void qc.invalidateQueries({ queryKey: ["pipeline", baseId, "board"] });
      void qc.invalidateQueries({ queryKey: ["home", baseId] });
      if (deal.lead_id) void qc.invalidateQueries({ queryKey: keys.contacts.deals(baseId, deal.lead_id) });
    },
  });
}

export function useAddDealNote(dealId: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: string) => pipelineApi.addNote(baseId, dealId, body),
    onSuccess: () => {
      haptics.success();
      toast.show(t("contacts.noteSaved"), { kind: "success" });
      void qc.invalidateQueries({ queryKey: keys.pipeline.dealTimeline(baseId, dealId) });
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
}
