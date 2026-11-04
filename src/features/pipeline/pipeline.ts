import type { Deal, DealInput, Stage } from "@/types/pipeline";
import { normalizeDecimal } from "@/features/invoices/draft";

/** Pure: stages in board order. */
export function orderedStages(stages: Stage[]): Stage[] {
  return [...stages].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/** Pure: the next open stage after this one (for "advance"), or null at the end of the open stages. */
export function nextStage(stages: Stage[], currentId: number | null): Stage | null {
  const open = orderedStages(stages).filter((s) => !s.is_won && !s.is_lost);
  const i = open.findIndex((s) => s.id === currentId);
  return i >= 0 && i < open.length - 1 ? open[i + 1]! : null;
}

/** Pure: how far through the open stages a deal is (0–1), for the progress strip. Won = 1, lost = 0. */
export function stageProgress(stages: Stage[], deal: Pick<Deal, "stage_id" | "status">): number {
  if (deal.status === "won") return 1;
  if (deal.status === "lost") return 0;
  const open = orderedStages(stages).filter((s) => !s.is_won && !s.is_lost);
  const i = open.findIndex((s) => s.id === deal.stage_id);
  return open.length ? (i + 1) / (open.length + 1) : 0;
}

/** Pure: whole days a deal has sat in its stage (null when unknown). */
export function daysInStage(deal: Pick<Deal, "stage_entered_at">, now: number): number | null {
  if (!deal.stage_entered_at) return null;
  const t = Date.parse(deal.stage_entered_at);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null;
}

/** Pure: how a deal's time in its stage reads: new today, fine, getting long (over 14 days), too long (over 30). */
export function stageAgeTone(days: number): "new" | "neutral" | "warning" | "danger" {
  return days <= 0 ? "new" : days > 30 ? "danger" : days > 14 ? "warning" : "neutral";
}

/** Pure: "rotting" when a stage has a limit and the deal is past it. */
export function isRotting(deal: Pick<Deal, "stage_entered_at" | "status">, stage: Pick<Stage, "rotting_days"> | undefined, now: number): boolean {
  if (deal.status !== "open" || !stage?.rotting_days) return false;
  const d = daysInStage(deal, now);
  return d != null && d > stage.rotting_days;
}

/** Pure: an ISO day (YYYY-MM-DD) in local time — what the API's `z.string().date()` expects. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pure: quick close-date choices (no date-picker library): end of this month, end of next, in 3 months. */
export function closeDateChoices(now: Date): { key: "thisMonth" | "nextMonth" | "quarter"; date: string }[] {
  const endOf = (monthOffset: number) => new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return [
    { key: "thisMonth", date: isoDay(endOf(0)) },
    { key: "nextMonth", date: isoDay(endOf(1)) },
    { key: "quarter", date: isoDay(endOf(3)) },
  ];
}

/**
 * Pure: the API body for create/update — trimmed, typed, nothing extra. Returns an error key when invalid.
 * `update`: an emptied amount or close date is sent as null, so it is cleared (left out, the server kept
 * the old value). A new deal just leaves them out.
 */
export function dealBody(input: DealInput, mode: "create" | "update" = "create"): { ok: true; body: Record<string, unknown> } | { ok: false; field: "name" | "amount" } {
  const name = input.name.trim();
  if (!name) return { ok: false, field: "name" };
  // Same reading as invoices: "1250,5" on a comma-decimal keyboard is 1250.5, not 12505.
  const raw = normalizeDecimal(input.amount);
  const amount = raw ? Number(raw) : null;
  if (raw && (!Number.isFinite(amount) || (amount ?? 0) < 0)) return { ok: false, field: "amount" };
  return {
    ok: true,
    body: {
      name,
      ...(amount != null ? { amount } : mode === "update" ? { amount: null } : {}),
      currency: input.currency,
      ...(input.stage_id ? { stage_id: input.stage_id } : {}),
      lead_id: input.lead_id,
      ...(input.expected_close_date ? { expected_close_date: input.expected_close_date } : mode === "update" ? { expected_close_date: null } : {}),
    },
  };
}
