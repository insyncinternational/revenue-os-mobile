/**
 * Agency data for the agency area. Every key starts with ["agency", agencyId], so switching agency never shows
 * another agency's numbers. What a person may do follows the web: agency admins everything, agency users only
 * what their staff scopes allow (and only their assigned clients, which the server already filters).
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { workspacesApi } from "@/api/workspaces";
import { haptics } from "@/lib/haptics";
import { useAppMode } from "@/session/mode";
import { workspaceKeys } from "@/session/workspace";
import type { AgencyScopeKey, ClientStatusFilter } from "@/types/agency";
import { useToast } from "@/ui/Toast";

export type Days = 7 | 30 | 90;

export const agencyKeys = {
  all: (id: number) => ["agency", id] as const,
  info: (id: number) => ["agency", id, "info"] as const,
  scopes: (id: number) => ["agency", id, "scopes"] as const,
  dashboard: (id: number) => ["agency", id, "dashboard"] as const,
  reports: (id: number, days: Days) => ["agency", id, "reports", days] as const,
  usage: (id: number, days: Days) => ["agency", id, "usage", days] as const,
  clients: (id: number) => ["agency", id, "clients"] as const,
  clientList: (id: number, q: string, status: ClientStatusFilter) => ["agency", id, "clients", "list", q, status] as const,
  client: (id: number, clientId: number) => ["agency", id, "clients", "detail", clientId] as const,
  clientTeam: (id: number, clientId: number) => ["agency", id, "clients", "team", clientId] as const,
  customers: (id: number, clientId: number, q: string) => ["agency", id, "clients", "customers", clientId, q] as const,
  credits: (id: number) => ["agency", id, "credits"] as const,
  billing: (id: number) => ["agency", id, "billing"] as const,
  team: (id: number) => ["agency", id, "team"] as const,
  invites: (id: number) => ["agency", id, "clientInvites"] as const,
  activity: (id: number, q: string) => ["agency", id, "activity", q] as const,
};

/** The agencies this person belongs to (shared with the workspace switcher's cache). */
export function useMyAgencies(enabled = true) {
  return useQuery({ queryKey: workspaceKeys.agencies(), queryFn: ({ signal }) => workspacesApi.myAgencies(signal), staleTime: 10 * 60_000, enabled });
}

/** The agency open in the agency area (0 = none yet). */
export function useAgencyId(): number {
  return useAppMode((s) => s.agencyId) ?? 0;
}

export function useAgencyInfo() {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.info(id), queryFn: ({ signal }) => agencyApi.get(id, signal), enabled: id > 0, staleTime: 5 * 60_000 });
}

function useAgencyScopes() {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.scopes(id), queryFn: ({ signal }) => agencyApi.scopes(id, signal), enabled: id > 0, staleTime: 5 * 60_000 });
}

/** Agency admin (or platform admin): every agency action, the team audit log and the agency's notes on clients. */
export function useIsAgencyAdmin(): boolean {
  const role = useAgencyInfo().data?.role;
  return role === "agency_admin" || role === "platform_admin";
}

/** May this person do `scope` in the open agency? False until loaded (buttons appear, never vanish). */
export function useAgencyCan(scope: AgencyScopeKey): boolean {
  const admin = useIsAgencyAdmin();
  const scopes = useAgencyScopes().data?.mine?.scopes;
  return admin || scopes?.[scope] === true;
}

export function useAgencyDashboard() {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.dashboard(id), queryFn: ({ signal }) => agencyApi.dashboard(id, signal), enabled: id > 0, staleTime: 60_000 });
}

export function useAgencyReports(days: Days) {
  const id = useAgencyId();
  return useQuery({
    queryKey: agencyKeys.reports(id, days),
    queryFn: ({ signal }) => agencyApi.reports(id, days, signal),
    enabled: id > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAgencyUsage(days: Days, enabled = true) {
  const id = useAgencyId();
  return useQuery({
    queryKey: agencyKeys.usage(id, days),
    queryFn: ({ signal }) => agencyApi.usage(id, days, signal),
    enabled: enabled && id > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAgencyClients(q: string, status: ClientStatusFilter) {
  const id = useAgencyId();
  return useInfiniteQuery({
    queryKey: agencyKeys.clientList(id, q, status),
    queryFn: ({ signal, pageParam }) => agencyApi.clients(id, { q, status, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.clients.length, 0);
      return loaded < last.total && last.clients.length > 0 ? loaded : undefined;
    },
    enabled: id > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAgencyClient(clientId: number) {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.client(id, clientId), queryFn: ({ signal }) => agencyApi.client(id, clientId, signal), enabled: id > 0 && clientId > 0, staleTime: 30_000 });
}

export function useClientTeam(clientId: number) {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.clientTeam(id, clientId), queryFn: ({ signal }) => agencyApi.clientTeam(id, clientId, signal), enabled: id > 0 && clientId > 0, staleTime: 30_000 });
}

export function useClientCustomers(clientId: number, q: string) {
  const id = useAgencyId();
  return useQuery({
    queryKey: agencyKeys.customers(id, clientId, q),
    queryFn: ({ signal }) => agencyApi.customers(id, clientId, q, signal),
    enabled: id > 0 && clientId > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAgencyCredits() {
  const id = useAgencyId();
  return useInfiniteQuery({
    queryKey: agencyKeys.credits(id),
    queryFn: ({ signal, pageParam }) => agencyApi.credits(id, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.transfers.length, 0);
      return last.total != null && loaded < last.total && last.transfers.length > 0 ? pages.length + 1 : undefined;
    },
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useAgencyBilling(enabled = true) {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.billing(id), queryFn: ({ signal }) => agencyApi.billing(id, signal), enabled: enabled && id > 0, staleTime: 60_000 });
}

export function useAgencyTeam() {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.team(id), queryFn: ({ signal }) => agencyApi.team(id, signal), enabled: id > 0, staleTime: 60_000 });
}

export function useClientInvites(enabled = true) {
  const id = useAgencyId();
  return useQuery({ queryKey: agencyKeys.invites(id), queryFn: ({ signal }) => agencyApi.clientInvites(id, signal), enabled: enabled && id > 0, staleTime: 60_000 });
}

export function useAgencyActivity(q: string, enabled = true) {
  const id = useAgencyId();
  return useInfiniteQuery({
    queryKey: agencyKeys.activity(id, q),
    queryFn: ({ signal, pageParam }) => agencyApi.activity(id, { q, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.activity.length, 0);
      return loaded < last.total && last.activity.length > 0 ? loaded : undefined;
    },
    enabled: enabled && id > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * An agency action: runs it, shows the outcome, and refreshes everything of this agency (lists, numbers, the
 * client panel) so no screen shows stale counts afterwards. `success` may be text or a function of the result.
 */
export function useAgencyAction<V, R>(fn: (agencyId: number, vars: V) => Promise<R>, opts: { success?: string | ((r: R, v: V) => string | null); onDone?: (r: R, v: V) => void } = {}) {
  const id = useAgencyId();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (vars: V) => fn(id, vars),
    onSuccess: (r, v) => {
      haptics.success();
      const text = typeof opts.success === "function" ? opts.success(r, v) : opts.success;
      if (text) toast.show(text, { kind: "success" });
      void qc.invalidateQueries({ queryKey: agencyKeys.all(id) });
      opts.onDone?.(r, v);
    },
    onError: (e) => {
      haptics.warning();
      toast.show(userMessage(e), { kind: "error" });
    },
  });
}
