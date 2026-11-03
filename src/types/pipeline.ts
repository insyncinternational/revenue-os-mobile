/** Sales pipeline (backend routes/crm.ts, services/crm/crmBoard.service.ts). */

export type Stage = {
  id: number;
  pipeline_id: number;
  name: string;
  sort_order: number;
  probability: number | null;
  is_won: boolean;
  is_lost: boolean;
  /** Set per stage by the workspace (data, not theme). */
  color: string | null;
  rotting_days: number | null;
};

export type Pipeline = { id: number; name: string; is_default: boolean; open_deal_count?: number };

export type Deal = {
  id: number;
  name: string;
  stage_id: number | null;
  pipeline_id: number | null;
  /** Null when the user can't see money (deals:read). */
  amount: number | null;
  currency: string | null;
  status: "open" | "won" | "lost";
  probability: number | null;
  expected_close_date: string | null;
  lead_id: number | null;
  account_id: number | null;
  owner_id: number | null;
  lost_reason: string | null;
  description?: string | null;
  stage_entered_at?: string | null;
  last_activity_at?: string | null;
  updatedAt?: string;
  stage?: Stage | null;
  account?: { id: number; name: string } | null;
  lead?: { id: number; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; company: string | null } | null;
  owner?: { id: number; name: string | null; email: string } | null;
};

export type StageTotal = { count: number; value: number; weighted_value: number; shown: number };

export type Board = {
  pipeline_id: number;
  stages: Stage[];
  dealsByStage: Record<string, Deal[]>;
  stage_totals: Record<string, StageTotal>;
  per_stage_limit: number;
};

export type CrmBootstrap = {
  stages: Stage[];
  lost_reasons: string[];
  members: { id: number; name: string | null; email: string }[];
  settings: { default_currency: string };
};

export type DealInput = {
  name: string;
  amount: string;
  currency: string;
  stage_id: number | null;
  lead_id: number | null;
  expected_close_date: string | null;
};
