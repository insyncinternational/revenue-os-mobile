import { router } from "expo-router";
import { useAppMode } from "@/session/mode";
import { useSession } from "@/session/sessionStore";
import { AGENCY_HOME } from "./navigate";

/**
 * "Open client": into one of a client's workspaces with the normal tabs (the web's "Open client" — no session
 * change, the agency member works in the client's workspace with their staff role). "Back to agency" returns.
 */
export function openClientWorkspace(baseId: number): void {
  useSession.getState().setActiveBase(baseId);
  useAppMode.getState().enterWorkspace();
  if (router.canDismiss()) router.dismissAll();
  router.replace("/");
}

/** Back to the agency area from a client's workspace. */
export function backToAgency(agencyId: number): void {
  useAppMode.getState().enterAgency(agencyId);
  if (router.canDismiss()) router.dismissAll();
  router.replace(AGENCY_HOME);
}
