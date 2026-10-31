/**
 * The active workspace: which one, what the user may do in it, and its agency branding.
 * Every workspace screen reads `useActiveBaseId()` and `useCan()` from here.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";
import { workspacesApi } from "@/api/workspaces";
import { useBrandColor } from "@/theme/brandStore";
import type { MobileCapability } from "@/types/workspace";
import { useSession } from "./sessionStore";

export const workspaceKeys = {
  list: () => ["me", "workspaces"] as const,
  access: (baseId: number) => ["me", "access", baseId] as const,
  agencies: () => ["me", "agencies"] as const,
  agencyClients: (agencyId: number, q: string) => ["me", "agencyClients", agencyId, q] as const,
  clientWorkspaces: (clientId: number) => ["me", "clientWorkspaces", clientId] as const,
};

export function useActiveBaseId(): number | null {
  return useSession((s) => s.activeBaseId);
}

export function useWorkspaceList() {
  return useQuery({ queryKey: workspaceKeys.list(), queryFn: ({ signal }) => workspacesApi.list(undefined, signal), staleTime: 5 * 60_000 });
}

export function useWorkspaceAccess() {
  const baseId = useActiveBaseId();
  return useQuery({
    queryKey: workspaceKeys.access(baseId ?? 0),
    queryFn: ({ signal }) => workspacesApi.access(baseId!, signal),
    enabled: baseId != null,
    staleTime: 5 * 60_000,
  });
}

/** May the user do this in the active workspace? False until access has loaded (buttons appear, never vanish). */
export function useCan(capability: MobileCapability): boolean {
  return useWorkspaceAccess().data?.capabilities[capability] === true;
}

/** Is this module switched on for the workspace (not locked by plan, agency or admin)? */
export function useModuleEnabled(module: string): boolean {
  const locked = useWorkspaceAccess().data?.locked_modules;
  return !locked || !locked.includes(module);
}

/**
 * Keeps a valid workspace selected and the theme on its agency colour:
 *  - nothing selected yet → the most recent workspace the user can open;
 *  - the selected one was removed or access was taken away → fall back the same way.
 * Returns whether the user has no workspace at all.
 */
export function useWorkspaceBootstrap(): { noWorkspace: boolean; loading: boolean } {
  const baseId = useActiveBaseId();
  const setActiveBase = useSession((s) => s.setActiveBase);
  const list = useWorkspaceList();
  const access = useWorkspaceAccess();
  const setBrand = useBrandColor((s) => s.setWorkspace);

  const lostAccess = access.error instanceof ApiError && (access.error.kind === "forbidden" || access.error.kind === "notFound");
  const first = list.data?.bases[0]?.id ?? null;

  useEffect(() => {
    if ((baseId == null || lostAccess) && list.isSuccess) setActiveBase(first !== baseId ? first : null);
  }, [baseId, lostAccess, list.isSuccess, first, setActiveBase]);

  const branding = access.data?.branding;
  useEffect(() => {
    setBrand(branding?.source === "agency" ? branding.primary_color : null);
  }, [branding, setBrand]);

  return { noWorkspace: list.isSuccess && list.data.bases.length === 0 && baseId == null, loading: baseId == null && list.isPending };
}
