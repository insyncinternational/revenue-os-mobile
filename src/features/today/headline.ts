import type { TranslationKey } from "@/i18n";
import { appLinkFor } from "@/lib/links";
import type { AiRecommendation, MyDayCounter, PlanItem } from "@/types/home";

/**
 * Pure: Today's one-line summary, from the same counters and rules as the backend's buildHeadline
 * (services/metrics/myDay.service.ts) — written by the app so it's translated and only suggests things the
 * phone can do (the web's "start a campaign" isn't one of them).
 */
export function todayHeadline(counters: Pick<MyDayCounter, "key" | "count" | "urgent">[], approvals = 0): { key: TranslationKey; vars?: Record<string, number> } {
  const total = counters.reduce((n, c) => n + (c.count || 0), 0);
  if (total === 0 && approvals === 0) return { key: "today.headlineClear" };
  const replies = counters.find((c) => c.key === "replies")?.count ?? 0;
  if (replies > 0) return replies === 1 ? { key: "today.headlineReplyOne" } : { key: "today.headlineReplies", vars: { count: replies } };
  // AI work waiting on a yes (not in the counters): a lead may be waiting behind each one.
  if (approvals > 0) return approvals === 1 ? { key: "today.headlineApprovalOne" } : { key: "today.headlineApprovals", vars: { count: approvals } };
  const urgent = counters.filter((c) => c.urgent).reduce((n, c) => n + (c.count || 0), 0);
  if (urgent > 0) return urgent === 1 ? { key: "today.headlineUrgentOne" } : { key: "today.headlineUrgent", vars: { count: urgent } };
  return total === 1 ? { key: "today.headlineItemOne" } : { key: "today.headlineItems", vars: { count: total } };
}

/**
 * Pure: the suggestions worth showing under everything else — not the ones that send you where an Up next item
 * already does ("1 conversation is waiting" beside "Reply to Nina" said the same thing twice).
 */
export function freshSuggestions(recs: AiRecommendation[], items: Pick<PlanItem, "actions">[]): AiRecommendation[] {
  const covered = new Set(items.flatMap((i) => i.actions.flatMap((a) => (a.kind === "open" ? [appLinkFor(a.href)] : []))).filter(Boolean));
  return recs.filter((r) => !covered.has(appLinkFor(r.href)));
}
