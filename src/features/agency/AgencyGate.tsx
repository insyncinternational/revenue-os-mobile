import { useEffect, type ReactNode } from "react";
import { Redirect } from "expo-router";
import { agencyApi } from "@/api/agency";
import { useAppMode } from "@/session/mode";
import { useBrandColor } from "@/theme/brandStore";
import { AgencyHomeSkeleton } from "./AgencyHomeSkeleton";
import { useAgencyId, useAgencyInfo, useMyAgencies } from "./useAgency";

const entered = new Set<number>();

/**
 * In front of the agency tabs: only agency members in agency mode get in (anyone else goes back to the workspace
 * tabs). Uses the agency's own brand colour, and records the visit in the agency's audit log once per launch,
 * as the web does when its agency area opens.
 */
export function AgencyGate({ children }: { children: ReactNode }) {
  const mode = useAppMode((s) => s.mode);
  const agencyId = useAgencyId();
  const agencies = useMyAgencies();
  const info = useAgencyInfo();
  const member = agencies.data ? agencies.data.agencies.some((a) => a.id === agencyId) : true;
  const setBrand = useBrandColor((s) => s.setWorkspace);
  const color = info.data?.agency.primary_color ?? null;

  useEffect(() => {
    if (mode === "agency" && agencyId > 0 && member) setBrand(color);
  }, [mode, agencyId, member, color, setBrand]);

  useEffect(() => {
    if (mode !== "agency" || agencyId <= 0 || entered.has(agencyId)) return;
    entered.add(agencyId);
    void agencyApi.enter(agencyId).catch(() => undefined);
  }, [mode, agencyId]);

  // Removed from the agency since: back to the workspace (TabsGate picks another agency or the workspace).
  useEffect(() => {
    if (mode === "agency" && agencies.data && !member) useAppMode.getState().enterWorkspace();
  }, [mode, agencies.data, member]);

  if (mode !== "agency" || agencyId <= 0 || !member) return <Redirect href="/" />;
  if (!info.data && info.isPending) {
    return <AgencyHomeSkeleton />;
  }
  return <>{children}</>;
}
