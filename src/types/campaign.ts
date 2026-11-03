/** GET /api/campaigns — the fields the phone's read-only list uses (backend routes/campaigns/main.ts). */
export type CampaignChannel = "email" | "linkedin" | "whatsapp" | "call";

export type CampaignStatus = "draft" | "running" | "paused" | "completed";

export type CampaignProgress = {
  reached: number;
  audience: number;
  state: "not_started" | "scheduled" | "sending" | "paused" | "guard_paused" | "finished" | "ended_early" | "ended_on_schedule" | "draft";
  next_send_at: string | null;
  reason: string | null;
};

export type Campaign = {
  id: number;
  name: string;
  status: CampaignStatus | string;
  channel?: string | null;
  channels?: string[] | null;
  leads?: number | string | null;
  sent?: number | string | null;
  replied?: number | string | null;
  aggregate_sent?: number | string | null;
  aggregate_replied?: number | string | null;
  archived_at?: string | null;
  config?: { schedule?: { end?: string | null } | null } | null;
  progress?: CampaignProgress | null;
  updatedAt?: string;
};
