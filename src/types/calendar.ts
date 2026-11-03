/** Meetings (backend routes/meetings.ts, services/meetings/meetings.service.ts MeetingRecord). */

export type MeetingView = "upcoming" | "needs_outcome" | "past" | "cancelled";

export type Meeting = {
  id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  /** pending → scheduled; completed → outcome recorded; cancelled. */
  status: "pending" | "completed" | "cancelled" | string;
  lead_id: number | null;
  deal_id: number | null;
  contact_name: string | null;
  company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  owner_id: number | null;
  owner_name: string | null;
  owner_ids: number[];
  owners: { id: number; name: string | null }[];
  reminder_state: "scheduled" | "sent" | "none" | "overdue";
  outcome: "attended" | "no_show" | "cancelled" | string | null;
  outcome_at: string | null;
  join_url: string | null;
  /** Slotwise bookings are changed in Slotwise; this is its manage page. */
  manage_url: string | null;
  source: "slotwise" | "manual";
  calendar: "google" | "outlook" | null;
  notes: string | null;
  next_step: string | null;
};

export type MeetingPage = { meetings: Meeting[]; has_more: boolean };

export type MeetingsSummary = {
  today: number;
  next_7_days: number;
  upcoming: number;
  needs_outcome: number;
  attended_30d: number;
  no_show_30d: number;
  show_rate: number | null;
  reminders_overdue: number;
};

export type OutcomeInput =
  | { outcome: "attended"; notes?: string; next_step?: string; next_step_due?: string }
  | { outcome: "no_show"; follow_up: boolean; notes?: string };
