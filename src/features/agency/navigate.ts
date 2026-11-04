/** Opening agency screens (they sit above the agency tabs in the (app) stack, so Back returns to the tab). */
import { router, type Href } from "expo-router";

/** The agency tabs' first screen (Home). Typed by hand: the generated route types list it as "/agency/index". */
export const AGENCY_HOME = "/agency" as Href;

export function openAgencyClient(id: number): void {
  router.push({ pathname: "/agency-client/[id]", params: { id: String(id) } });
}

export function openClientEdit(id: number): void {
  router.push({ pathname: "/agency-client-edit", params: { id: String(id) } });
}

export function openClientPeople(id: number, tab: "team" | "customers" = "team"): void {
  router.push({ pathname: "/agency-client-people", params: { id: String(id), tab } });
}

/** Give credits to a client (or take some back); without a client, the sheet asks which one. */
export function openMoveCredits(opts: { clientId?: number; take?: boolean } = {}): void {
  const params: Record<string, string> = {};
  if (opts.clientId) params.clientId = String(opts.clientId);
  if (opts.take) params.take = "1";
  router.push({ pathname: "/agency-credits-move", params });
}

export function openNewClient(): void {
  router.push("/agency-client-new");
}

export function openInviteClient(): void {
  router.push("/agency-invite");
}

export function openAgencyTeam(): void {
  router.push("/agency-team");
}

export function openTeamInvite(): void {
  router.push("/agency-team-invite");
}

export function openAgencyReports(tab: "results" | "usage" = "results"): void {
  router.push({ pathname: "/agency-reports", params: { tab } });
}

export function openAgencyActivity(): void {
  router.push("/agency-activity");
}

export function openAgencyBilling(): void {
  router.push("/agency-billing");
}

export function openBuyCredits(): void {
  router.push("/agency-buy-credits");
}
