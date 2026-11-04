/**
 * Agency portal DTOs (backend routes/agencies.ts, agencyClients.ts, agencyBilling.ts, agencyStaffScopes.ts).
 * Kept to the fields the app shows; the web's lib/agencyApi.ts has the full shapes.
 */

export type AgencyRole = "platform_admin" | "agency_admin" | "agency_user";
export type AgencyMemberRole = "agency_admin" | "agency_user";

/** GET /agencies/:id */
export type AgencyInfo = {
  agency: {
    id: number;
    name: string;
    status: "active" | "suspended";
    plan_key: string;
    max_clients: number | null;
    lead_credits: number;
    ai_tokens: number;
    brand_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    trial_ends_at?: string | null;
    on_trial?: boolean;
    trial_ended?: boolean;
    closed_at?: string | null;
  };
  role: AgencyRole;
  stats: { clients: number; max_clients: number | null };
};

export type AgencyScopeKey = "create_clients" | "manage_snapshots" | "manage_credits" | "manage_billing" | "manage_white_label" | "open_clients" | "login_as_owner";
export type AgencyScopes = Record<AgencyScopeKey, boolean> & { workspace_role: "admin" | "editor" | "viewer" };

/** GET /agency-scopes/:id (`mine` is the caller's own). */
export type AgencyScopesResponse = { mine: { role: string; scopes: AgencyScopes } | null };

/** One client account (a business). `id` is the client (organization) id used in every `:clientId` route. */
export type ClientRow = {
  id: number;
  name: string;
  business_name: string | null;
  email: string;
  owner_user_id: number;
  workspaces: number;
  leads: number;
  deals_open: number;
  deals_won_value: number;
  campaigns_active: number;
  credits_balance: number;
  ai_tokens_balance: number;
  last_active_at: string | null;
  suspended: boolean;
  active: boolean;
  paused?: boolean;
  paused_reason?: "client" | "agency" | null;
  in_trash?: boolean;
  purge_after?: string | null;
};

export type ClientStatusFilter = "all" | "suspended" | "trash";

export type AgencyTotals = {
  clients: number;
  workspaces: number;
  leads: number;
  deals_open: number;
  deals_won_value: number;
  campaigns_active: number;
  lead_credits: number;
  ai_tokens: number;
};

export type ReportTotals = { leads: number; sent: number; replies: number; meetings: number; deals_won: number; won_value: number };
export type ReportRated = ReportTotals & { reply_rate_pct: number | null };

/** GET /agencies/:id/reports?days= */
export type AgencyReport = {
  days: 7 | 30 | 90;
  totals: ReportRated & { previous?: ReportRated };
  daily: ({ day: string } & ReportTotals)[];
  clients: ({ id: number; name: string; previous?: ReportRated } & ReportRated)[];
};

/** GET /agencies/:id/usage?days= */
export type AgencyUsage = {
  window: { days: 7 | 30 | 90; from: string; to: string };
  totals: { credits_spent: number; credits_given: number; clients_active: number; clients: number };
  by_operation: { operation: string; label: string; credits: number }[];
  daily: { date: string; credits_spent: number }[];
  clients: {
    id: number;
    name: string;
    business_name: string | null;
    credits_spent: number;
    credits_given: number;
    credits_balance: number;
    ai_tokens_balance: number;
    last_spend_at: string | null;
    top_operation: string | null;
  }[];
  pool: { lead_credits: number; ai_tokens: number };
};

export type Transfer = {
  id: number;
  from_type: "platform" | "agency" | "organization";
  to_type: "agency" | "client" | "organization";
  to_id: number;
  lead_credits: number;
  ai_tokens: number;
  note: string | null;
  created_at: string | null;
  client?: { id: number; name: string; email: string; business_name: string | null } | null;
};

/** GET /agencies/:id/credits */
export type AgencyCredits = { lead_credits: number; ai_tokens: number; transfers: Transfer[]; total?: number; page?: number; limit?: number };

export type CreditResult = { transfer: Transfer; agency: { lead_credits: number; ai_tokens: number }; client: { id: number; credits_balance: number; ai_tokens_balance: number } };

/** GET /agencies/:id/clients/:clientId */
export type ClientDetail = {
  client: ClientRow;
  profile: { business_name: string | null; website_url: string | null; industry: string | null; description: string | null; logo_url: string | null; created_at: string | null };
  owner: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    timezone: string | null;
    created_at: string | null;
    last_login_at: string | null;
    email_verified: boolean;
    active: boolean;
    email_editable: boolean;
    signs_in_with: "password" | "google" | null;
  };
  status: {
    account_suspended: boolean;
    paused: boolean;
    paused_reason: "client" | "agency" | null;
    paused_at: string | null;
    paused_by_platform: boolean;
    in_trash: boolean;
    purge_after: string | null;
    deleted_by_platform: boolean;
  };
  credits: { lead_credits: number; ai_tokens: number; spent_30d: number; transfers: (Transfer & { direction: "given" | "taken_back" })[] };
  plan: { name: string; status: string | null; period_end: string | null } | null;
  workspaces: { id: number; name: string; created_at: string | null; members: number; leads: number; campaigns: number }[];
  staff: { id: number; name: string; email: string }[];
  /** Agency admins only (null for agency users). */
  notes: string | null;
  activity: { id: number; action: string; summary: string | null; created_at: string | null; actor: { name: string; email: string } | null }[];
};

export type ClientProfilePatch = {
  business_name?: string;
  website_url?: string | null;
  industry?: string | null;
  owner_name?: string;
  owner_email?: string;
};

export type ClientTeamRole = "admin" | "editor" | "viewer";

/** GET /agencies/:id/clients/:clientId/team */
export type ClientTeam = {
  workspaces: {
    id: number;
    name: string;
    members: { user_id: number; name: string; email: string; role: string; is_owner: boolean; access_disabled: boolean; closes_account_if_removed: boolean; last_login_at: string | null }[];
    invitations: { id: number; email: string; role: string; expires_at: string | null; expired: boolean }[];
    seats: { total: number; used: number };
  }[];
  roles: ClientTeamRole[];
};

/** A person with a login to the client's customer portal. */
export type PortalCustomerRow = {
  id: number;
  email: string;
  name: string | null;
  status: "invited" | "active" | "disabled";
  access: "ok" | "blocked" | "client_suspended" | "client_in_trash";
  last_login_at: string | null;
  invited_at: string | null;
};

/** POST /agencies/:id/clients */
export type NewClientBody = { business_name: string; owner_name: string; owner_email: string; website_url?: string | null; timezone?: string | null; lead_credits?: number };

export type TeamMember = {
  user_id: number;
  name: string | null;
  email: string | null;
  role: AgencyMemberRole;
  client_ids: number[];
  last_active_at: string | null;
  added_at: string | null;
  active: boolean;
};
export type TeamInvite = { email: string; role: AgencyMemberRole; invited_at: string | null };

export type ActivityRow = { id: number; action: string; summary: string; client_id: number | null; at: string | null; actor: { name: string; email: string } | null };

/** GET /agencies/:id/billing (fields the app shows). */
export type AgencyBillingOverview = {
  billing: {
    plan_name: string;
    max_clients: number | null;
    billing_status: "active" | "past_due" | "canceled" | null;
    billing_period_end: string | null;
    billing_grace_ends_at: string | null;
    suspended_by_billing: boolean;
    has_customer: boolean;
    has_subscription: boolean;
    trial_ends_at?: string | null;
    on_trial?: boolean;
    trial_ended?: boolean;
  };
  pool: { lead_credits: number; ai_tokens: number };
  auto_recharge: { enabled: boolean; threshold: number; credits: number; last_error: string | null; has_card: boolean };
  platform: { price_cents_per_1000: number; currency: string };
  stripe_configured: boolean;
  viewer: { role: AgencyRole; can_manage: boolean };
};

export type BuyCreditsResult = { credits: number; amount_cents: number; currency: string; payment_id: string; pool: number };

/** A client sign-up link (GET /agencies/:id/client-invites). "personal" is for one email; "shareable" for anyone. */
export type ClientInvite = {
  id: number;
  label: string | null;
  email: string | null;
  kind: "personal" | "shareable";
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked: boolean;
  usable: boolean;
  created_at: string | null;
  can_copy?: boolean;
};
