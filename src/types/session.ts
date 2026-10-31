/**
 * Session DTOs — copied from revenue-os-frontend/lib/apiClient.ts (User, Branding). Only the fields the app reads
 * are kept; keep in sync with the web when the backend changes.
 */

export type AgencyContact = { email: string | null; phone: string | null; website: string | null };

/** A paused client account: by its agency ('client') or because the agency is on hold ('agency'). */
export type PausedState = { reason: "client" | "agency"; paused_at: string | null; archived: boolean };

export type Branding = {
  source: "agency" | "platform";
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  agency_managed?: boolean;
  agency_name?: string;
  agency_contact?: AgencyContact;
  account_paused?: PausedState | null;
  login_url?: string | null;
};

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  company?: string;
  timezone?: string;
  role?: "admin" | "user";
  two_factor_enabled?: boolean;
  email_verified?: boolean;
  team_member_only?: boolean;
  /** Hide every money/billing surface (agency-managed clients, team members). */
  restrict_billing_ui?: boolean;
  branding?: Branding;
}
