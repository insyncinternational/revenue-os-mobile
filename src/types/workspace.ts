/** Workspace / agency DTOs (backend routes/bases.ts, routes/agencies.ts, routes/mobile.ts). */
import type { Branding } from "./session";

export type Workspace = {
  id: number;
  name: string;
  user_id: number;
  /** "agency": opened through the agency that manages this client (GET /bases?client=). */
  access?: "agency";
};

export type MobileCapability =
  | "inbox_read"
  | "inbox_reply"
  | "inbox_manage"
  | "contacts_read"
  | "contacts_create"
  | "contacts_edit"
  | "deals_money"
  | "deals_edit"
  | "tasks_create"
  | "tasks_edit"
  | "meetings_read"
  | "meetings_edit"
  | "calls_log"
  | "invoices_read"
  | "invoices_edit"
  | "ai_drafts_read"
  | "ai_drafts_decide"
  | "campaigns_read"
  | "campaigns_pause";

/** GET /api/mobile/access?base_id= */
export type WorkspaceAccess = {
  workspace: { id: number; name: string | null };
  role: string;
  source: "owner" | "member" | "agency" | "platform_admin";
  client: { id: number; name: string } | null;
  agency: { id: number; role: string } | null;
  branding: Branding;
  locked_modules: string[];
  capabilities: Record<MobileCapability, boolean>;
};

export type AgencyMembership = { id: number; name: string; role: string; logo_url: string | null };

/** GET /api/agencies/:id/clients — the fields the switcher shows. */
export type AgencyClient = {
  id: number;
  name: string;
  business_name: string | null;
  email: string;
  workspaces: number;
  paused: boolean;
  suspended: boolean;
  active: boolean;
};
