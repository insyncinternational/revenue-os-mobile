/** AI work waiting for a person (backend routes/aiSdr.ts /pending-actions and routes/aiActions.ts). */

export type AiDraftChannel = "email" | "whatsapp" | "linkedin" | "sms";

export type AiDraftActionType = "send_message" | "send_follow_up" | "book_meeting_prompt" | "mark_lost" | "escalate_human";

export type AiDraftStatus = "pending" | "approved" | "edited_approved" | "rejected" | "auto_approved" | "sent" | "failed" | "expired" | "cancelled";

export type AiDraftBooking = {
  start: string;
  end: string | null;
  timezone: string;
  requested_day: string | null;
  is_reschedule: boolean;
};

/** An AI SDR reply (or other step) the AI wants to take for a lead, waiting for approval. */
export type AiDraft = {
  id: number;
  base_id: number;
  lead_id: number;
  campaign_id: number | null;
  channel: AiDraftChannel;
  action_type: AiDraftActionType;
  status: AiDraftStatus;
  confidence: number | null;
  reason: string | null;
  skip_reason: string | null;
  proposed_subject: string | null;
  proposed_body: string | null;
  proposed_subject_b: string | null;
  proposed_body_b: string | null;
  edited_subject: string | null;
  edited_body: string | null;
  content_findings: unknown[];
  error_message: string | null;
  created_at: string;
  proposed_booking: AiDraftBooking | null;
  lead: { id: number; first_name: string | null; last_name: string | null; company: string | null; email: string | null; phone: string | null } | null;
  campaign: { id: number; name: string } | null;
  classification: { intent: string; confidence: number; reasoning: string | null } | null;
};

export type AiAgentActionStatus = "pending_approval" | "approved" | "executing" | "succeeded" | "failed" | "rejected" | "cancelled";

/** Something an AI agent wants to do (bulk send, CRM update from a call, merge…) that needs a yes first. */
export type AiAgentAction = {
  id: number;
  base_id: number;
  source: string;
  agent_id: string | null;
  agent_name: string | null;
  action_type: string;
  action_label: string;
  status: AiAgentActionStatus;
  title: string;
  error: string | null;
  lead_id: number | null;
  campaign_id: number | null;
  createdAt: string;
};
