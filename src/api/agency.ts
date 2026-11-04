/** The agency portal (backend /api/agencies/*, /api/agency-scopes). Same endpoints the web's agency area uses. */
import type {
  ActivityRow,
  AgencyBillingOverview,
  AgencyCredits,
  AgencyInfo,
  AgencyMemberRole,
  AgencyReport,
  AgencyScopesResponse,
  AgencyTotals,
  AgencyUsage,
  BuyCreditsResult,
  ClientDetail,
  ClientInvite,
  ClientProfilePatch,
  ClientRow,
  ClientStatusFilter,
  ClientTeam,
  ClientTeamRole,
  CreditResult,
  NewClientBody,
  PortalCustomerRow,
  TeamInvite,
  TeamMember,
} from "@/types/agency";
import { api } from "./client";

type Days = 7 | 30 | 90;
const A = (id: number, path = "") => `/agencies/${id}${path}`;
const C = (id: number, clientId: number, path = "") => `/agencies/${id}/clients/${clientId}${path}`;

export const agencyApi = {
  get: (id: number, signal?: AbortSignal) => api.get<AgencyInfo>(A(id), undefined, signal),
  /** Records `agency.enter` in the agency's audit log (as the web does when its agency area opens). */
  enter: (id: number) => api.post<unknown>(A(id, "/enter")),
  scopes: (id: number, signal?: AbortSignal) => api.get<AgencyScopesResponse>(`/agency-scopes/${id}`, undefined, signal),

  dashboard: (id: number, signal?: AbortSignal) => api.get<{ totals: AgencyTotals; clients: ClientRow[] }>(A(id, "/dashboard"), undefined, signal),
  reports: (id: number, days: Days, signal?: AbortSignal) => api.get<AgencyReport>(A(id, "/reports"), { days }, signal),
  usage: (id: number, days: Days, signal?: AbortSignal) => api.get<AgencyUsage>(A(id, "/usage"), { days }, signal),
  activity: (id: number, p: { q?: string; offset?: number }, signal?: AbortSignal) =>
    api.get<{ total: number; activity: ActivityRow[] }>(A(id, "/activity"), { q: p.q?.trim() || undefined, limit: 50, offset: p.offset ?? 0 }, signal),

  /* --- clients --- */
  clients: (id: number, p: { q?: string; status?: ClientStatusFilter; offset?: number }, signal?: AbortSignal) =>
    api.get<{ clients: ClientRow[]; total: number }>(
      A(id, "/clients"),
      { q: p.q?.trim() || undefined, status: p.status === "all" ? undefined : p.status, limit: 50, offset: p.offset ?? 0 },
      signal
    ),
  client: (id: number, clientId: number, signal?: AbortSignal) => api.get<ClientDetail>(C(id, clientId), undefined, signal),
  createClient: (id: number, body: NewClientBody) => api.post<{ client: ClientRow; invite_sent: boolean; invite_link?: string; warnings?: string[] }>(A(id, "/clients"), body),
  updateClient: (id: number, clientId: number, body: ClientProfilePatch) =>
    api.patch<{ ok: true; changed: string[]; invite?: { invite_sent: boolean; invite_link?: string }; client: ClientDetail }>(C(id, clientId), body),
  notes: (id: number, clientId: number, notes: string) => api.put<{ ok: true; notes: string }>(C(id, clientId, "/notes"), { notes }),
  suspend: (id: number, clientId: number) => api.post<{ client_id: number; other_client_accounts: number }>(C(id, clientId, "/suspend")),
  unsuspend: (id: number, clientId: number) => api.post<{ client_id: number }>(C(id, clientId, "/unsuspend")),
  restore: (id: number, clientId: number) => api.post<{ client_id: number; still_suspended: boolean }>(C(id, clientId, "/restore")),
  inviteLink: (id: number, clientId: number) => api.post<{ invite_link?: string; invite_sent: boolean }>(C(id, clientId, "/invite-link")),
  resendVerification: (id: number, clientId: number) => api.post<{ ok: true; email: string }>(C(id, clientId, "/resend-verification")),
  passwordReset: (id: number, clientId: number) => api.post<{ ok: true; email: string }>(C(id, clientId, "/password-reset")),
  signOutEverywhere: (id: number, clientId: number) => api.post<{ ok: true }>(C(id, clientId, "/sign-out")),

  /* --- credits --- */
  credits: (id: number, page: number, signal?: AbortSignal) => api.get<AgencyCredits>(A(id, "/credits"), { page, limit: 30 }, signal),
  allocate: (id: number, body: { client_id: number; lead_credits: number; note?: string }) => api.post<CreditResult>(A(id, "/credits/allocate"), body),
  takeBack: (id: number, clientId: number, body: { lead_credits: number; note?: string }) => api.post<CreditResult>(C(id, clientId, "/credits/take-back"), body),

  /* --- the client's people --- */
  clientTeam: (id: number, clientId: number, signal?: AbortSignal) => api.get<ClientTeam>(C(id, clientId, "/team"), undefined, signal),
  clientTeamUpdate: (id: number, clientId: number, workspaceId: number, userId: number, body: { role?: ClientTeamRole; access_disabled?: boolean }) =>
    api.patch<{ ok: true }>(C(id, clientId, `/workspaces/${workspaceId}/members/${userId}`), body),
  clientInviteResend: (id: number, clientId: number, workspaceId: number, invitationId: number) =>
    api.post<{ ok: true }>(C(id, clientId, `/workspaces/${workspaceId}/invitations/${invitationId}/resend`)),
  clientInviteRevoke: (id: number, clientId: number, workspaceId: number, invitationId: number) =>
    api.delete<{ ok: true }>(C(id, clientId, `/workspaces/${workspaceId}/invitations/${invitationId}`)),
  customers: (id: number, clientId: number, q: string, signal?: AbortSignal) =>
    api.get<{ customers: PortalCustomerRow[]; total: number }>(C(id, clientId, "/customers"), { limit: 100, q: q.trim() || undefined }, signal),
  customerBlock: (id: number, clientId: number, customerId: number, block: boolean) =>
    api.post<{ ok: true; status: string }>(C(id, clientId, `/customers/${customerId}/${block ? "block" : "unblock"}`)),

  /* --- client sign-up links --- */
  clientInvites: (id: number, signal?: AbortSignal) => api.get<{ invites: ClientInvite[] }>(A(id, "/client-invites"), undefined, signal),
  createClientInvite: (id: number, body: { email?: string | null; label?: string | null; send_email?: boolean }) =>
    api.post<{ invite: ClientInvite; url: string; email_sent?: boolean }>(A(id, "/client-invites"), body),
  clientInviteUrl: (id: number, inviteId: number) => api.get<{ url: string }>(A(id, `/client-invites/${inviteId}/link`)),

  /* --- team --- */
  team: (id: number, signal?: AbortSignal) => api.get<{ members: TeamMember[]; invites?: TeamInvite[] }>(A(id, "/team"), undefined, signal),
  addMember: (id: number, body: { email: string; role: AgencyMemberRole }) =>
    api.post<{ invited: true; email: string; invite_sent: boolean; invite_link?: string }>(A(id, "/team"), body),
  resendTeamInvite: (id: number, email: string) => api.post<{ email: string; invite_sent: boolean }>(A(id, "/team/invites/resend"), { email }),
  cancelTeamInvite: (id: number, email: string) => api.post<{ ok: true }>(A(id, "/team/invites/cancel"), { email }),
  setMemberRole: (id: number, userId: number, role: AgencyMemberRole) => api.patch<{ ok: true }>(A(id, `/team/${userId}`), { role }),
  removeMember: (id: number, userId: number) => api.delete<{ ok: true }>(A(id, `/team/${userId}`)),

  /* --- billing --- */
  billing: (id: number, signal?: AbortSignal) => api.get<AgencyBillingOverview>(A(id, "/billing"), undefined, signal),
  /** Charges the card on file; the same `request_key` never charges twice. */
  buyCredits: (id: number, body: { credits: number; request_key: string }) => api.post<BuyCreditsResult>(A(id, "/credits/buy"), body),
  billingPortal: (id: number) => api.post<{ url: string }>(A(id, "/billing/portal")),
};
