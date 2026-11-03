/**
 * GET /api/home and GET /api/home/my-day/plan — copied from revenue-os-backend/src/services/metrics/*
 * (kpiStrip, myDay, myDayPlan, homePanels, focusProspect, aiRecommendations). Sections the user can't see
 * (locked module, no deals:read) arrive as null.
 */

export type KpiMetric = {
  key: "leads_found" | "contacted" | "positive_replies" | "meetings" | "pipeline" | "won" | string;
  label: string;
  value: number;
  kind: "count" | "currency";
  changePct: number | null;
  changeKind: "pct" | "new" | "none" | "gone";
  previous: number;
  facts?: Record<string, number>;
};

export type MyDayCounter = { key: "hot_leads" | "replies" | "calls_due" | "meetings" | "followups" | "proposals" | string; label: string; count: number; href: string; urgent: boolean };

export type ConversationRow = {
  thread_id: number;
  channel: "email" | "whatsapp" | "linkedin";
  item_id: string;
  lead_id: number | null;
  contact_name: string;
  company: string | null;
  preview: string;
  intent: string | null;
  unread: boolean;
  last_message_at: string | null;
};

export type MeetingRow = {
  task_id: number;
  title: string;
  lead_id: number | null;
  contact_name: string | null;
  company: string | null;
  due_at: string | null;
  status: string;
  outcome: string | null;
  join_url: string | null;
};

export type PipelineOverview = { bars: { stage_id: number; label: string; count: number; value: number }[]; total_value: number; currency: string };

export type AiRecommendation = { key: string; text: string; action: string; href: string; tone: "opportunity" | "attention" | "risk"; weight: number; count: number };

export type FocusProspect = {
  lead_id: number;
  name: string;
  role: string | null;
  company: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  icp_fit: number | null;
  intent: "high" | "medium" | "low";
  signals: { id: number; title: string; priority: string; detected_at: string | null }[];
  recommended_action: { kind: "call" | "email"; label: string; reason: string };
};

export type HomeData = {
  base_id: number;
  since_days: number;
  kpis: { metrics: KpiMetric[]; currency: string; since_days: number } | null;
  my_day: { counters: MyDayCounter[]; total: number; headline: string } | null;
  conversations: ConversationRow[] | null;
  meetings: MeetingRow[] | null;
  pipeline: PipelineOverview | null;
  recommendations: AiRecommendation[] | null;
  focus_prospect: FocusProspect | null;
};

export type PlanAction =
  | { kind: "open"; label: string; href: string }
  | { kind: "call"; label: string; phone: string }
  | { kind: "complete_task"; label: string; task_id: number }
  | { kind: "approve"; label: string; action_id: number }
  | { kind: "brief"; label: string; lead_id: number }
  | { kind: "ask_lea"; label: string; prompt: string; lead_id?: number; deal_id?: number };

export type PlanItem = {
  id: string;
  kind: "approval" | "reply" | "meeting" | "call" | "follow_up" | "hot_lead" | "stalled_deal" | "attention";
  title: string;
  subtitle: string | null;
  reason: string;
  priority: number;
  due_at: string | null;
  lead_id: number | null;
  actions: PlanAction[];
};

export type MyDayPlan = { items: PlanItem[]; headline: string; generated_at: string };
