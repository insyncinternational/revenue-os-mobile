/** Contacts are Lead rows (backend models/lead.ts, routes/leads/*). Only the fields the app reads. */
export type Contact = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  region: string | null;
  industry: string | null;
  tier: string | null;
  score: number | null;
  notes: string | null;
  owner_id: number | null;
  owner?: { id: number; name: string | null; email: string; avatar_url: string | null } | null;
  last_activity_at?: string | null;
  last_activity_type?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ContactPage = {
  leads: Contact[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean };
};

/** GET /crm/timeline item (CrmActivity rows merged with campaign events). */
export type TimelineItem = {
  id: string | number;
  source: string;
  type: string;
  subject: string | null;
  body: string | null;
  occurred_at: string;
  user?: { id: number; name: string | null } | null;
  metadata?: Record<string, unknown> | null;
};

export type TaskType = "call" | "email" | "meeting" | "followup" | "other";
export type TaskPriority = "low" | "medium" | "high";

/** GET /api/crm/tasks rows (backend services/crm/crmTasks.service.ts withTaskAssignees + withTaskContacts). */
export type CrmTask = {
  id: number;
  title: string;
  description?: string | null;
  status: "pending" | "completed" | "cancelled";
  task_type: TaskType | null;
  priority?: TaskPriority | null;
  due_at: string | null;
  completed_at?: string | null;
  lead_id: number | null;
  deal_id: number | null;
  join_url?: string | null;
  assignee_id?: number | null;
  assignees?: { id: number; name: string | null; email: string | null }[];
  /** Who the task is about. */
  lead?: { id: number; first_name: string | null; last_name: string | null; company: string | null } | null;
};

export type TaskPage = { tasks: CrmTask[]; total: number; limit: number; offset: number; has_more: boolean };

export type TaskInput = {
  title: string;
  task_type: Exclude<TaskType, "meeting">;
  priority: TaskPriority;
  due_at: string | null;
  lead_id: number | null;
  deal_id: number | null;
  description: string;
};

export type DealSummary = {
  id: number;
  name: string;
  amount: number | null;
  currency: string | null;
  status: "open" | "won" | "lost";
  stage_id: number | null;
  stage?: { id: number; name: string; color?: string | null } | null;
  expected_close_date: string | null;
};

/** The only fields the app may write on a contact (see contactPatch). */
export type ContactInput = { first_name: string; last_name: string; email: string; phone: string; company: string; role: string; notes?: string };

export type CallOutcome = "interested" | "meeting_booked" | "follow_up" | "voicemail" | "no_answer" | "not_interested" | "wrong_person";
