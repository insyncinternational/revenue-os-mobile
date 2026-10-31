import type { AgencyClient, AgencyMembership, Workspace, WorkspaceAccess } from "@/types/workspace";
import { api } from "./client";

export const workspacesApi = {
  /** Workspaces the user owns or is a member of; with `clientId`, an agency client's workspaces too. */
  list: (clientId?: number, signal?: AbortSignal) => api.get<{ bases: Workspace[] }>("/bases", { client: clientId }, signal),

  access: (baseId: number, signal?: AbortSignal) => api.get<WorkspaceAccess>("/mobile/access", { base_id: baseId }, signal),

  myAgencies: (signal?: AbortSignal) => api.get<{ agencies: AgencyMembership[]; is_platform_admin: boolean }>("/agencies/mine", undefined, signal),

  agencyClients: (agencyId: number, q: string, signal?: AbortSignal) =>
    api.get<{ clients: AgencyClient[]; total: number }>(`/agencies/${agencyId}/clients`, { q: q.trim() || undefined, limit: 50 }, signal),
};
