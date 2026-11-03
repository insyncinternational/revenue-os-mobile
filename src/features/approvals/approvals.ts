import type { AiAgentAction, AiDraft } from "@/types/approvals";

/** One list for both kinds, newest first. */
export type ApprovalItem = { kind: "draft"; key: string; at: number; draft: AiDraft } | { kind: "action"; key: string; at: number; action: AiAgentAction };

export function mergeApprovals(drafts: AiDraft[] | undefined, actions: AiAgentAction[] | undefined): ApprovalItem[] {
  const items: ApprovalItem[] = [
    ...(drafts ?? []).map((draft) => ({ kind: "draft" as const, key: `d${draft.id}`, at: Date.parse(draft.created_at) || 0, draft })),
    ...(actions ?? []).map((action) => ({ kind: "action" as const, key: `a${action.id}`, at: Date.parse(action.createdAt) || 0, action })),
  ];
  return items.sort((a, b) => b.at - a.at);
}

/** "Sara Ahmed", else the company, email or phone — never blank. */
export function draftLeadName(draft: Pick<AiDraft, "lead">, fallback: string): string {
  const l = draft.lead;
  const name = [l?.first_name, l?.last_name].filter(Boolean).join(" ").trim();
  return name || l?.company || l?.email || l?.phone || fallback;
}

/** Hand-offs aren't approvals: the AI stopped and a person replies in the inbox instead. */
export function isApprovable(draft: Pick<AiDraft, "status" | "action_type">): boolean {
  return draft.status === "pending" && draft.action_type !== "escalate_human";
}

export type DraftVariant = "a" | "b";

/** The text the reviewer starts from for a version: their earlier edit (version A only), else the AI's draft. */
export function variantText(draft: AiDraft, variant: DraftVariant): { subject: string; body: string } {
  if (variant === "b" && draft.proposed_body_b?.trim()) {
    return { subject: draft.proposed_subject_b || draft.proposed_subject || "", body: draft.proposed_body_b };
  }
  return { subject: draft.edited_subject || draft.proposed_subject || "", body: draft.edited_body || draft.proposed_body || "" };
}

/**
 * What to send on approve (the web's PendingActionDetail rules): edited text only when it changed, and always the
 * text when version B is chosen, so the server sends B rather than A. Subjects only exist for email.
 */
export function approvePayload(draft: AiDraft, variant: DraftVariant, current: { subject: string; body: string }): { body?: string; subject?: string } {
  const baseline = variantText(draft, variant);
  const isB = variant === "b" && Boolean(draft.proposed_body_b?.trim());
  const out: { body?: string; subject?: string } = {};
  if (isB || current.body.trim() !== baseline.body.trim()) out.body = current.body;
  if (draft.channel === "email" && (isB || current.subject.trim() !== baseline.subject.trim())) out.subject = current.subject;
  return out;
}

/** "meeting_request" → "Meeting request". */
export function humanize(value: string | null | undefined): string {
  const s = String(value ?? "").replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** 0.82 → 82 (whole percent), null when unknown. */
export function confidencePercent(draft: Pick<AiDraft, "confidence" | "classification">): number | null {
  const v = draft.classification?.confidence ?? draft.confidence;
  return v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100);
}
