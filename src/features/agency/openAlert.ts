import { router } from "expo-router";
import { agencyIdInLink, agencyScreenInLink } from "./agency";
import { AGENCY_HOME, openAgencyBilling, openAgencyClient, openAgencyTeam } from "./navigate";
import { useAppMode } from "@/session/mode";

/**
 * Opens what an agency alert is about: the client that just signed up, else the screen its link names (Billing,
 * Clients, Credits, Team). Switches to that agency first when the alert belongs to another one.
 */
export function openAgencyAlert(data: { action_url?: string | null; agency_id?: number | string | null; client_id?: number | string | null }): void {
  const agencyId = Number(data.agency_id) || agencyIdInLink(data.action_url);
  if (agencyId && useAppMode.getState().agencyId !== agencyId) useAppMode.getState().enterAgency(agencyId);
  const clientId = Number(data.client_id);
  if (Number.isInteger(clientId) && clientId > 0) return openAgencyClient(clientId);
  switch (agencyScreenInLink(data.action_url)) {
    case "billing":
      return openAgencyBilling();
    case "clients":
      return router.navigate("/agency/clients");
    case "credits":
      return router.navigate("/agency/credits");
    case "team":
      return openAgencyTeam();
    default:
      return router.navigate(AGENCY_HOME);
  }
}
