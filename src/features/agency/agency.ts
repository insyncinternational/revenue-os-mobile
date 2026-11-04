/** Pure agency logic (unit tested): client names and states, client health, and the results numbers. */
import type { AgencyReport, ClientRow, ReportRated } from "@/types/agency";
import type { KpiMetric } from "@/types/home";
import type { NotificationRow } from "@/types/notifications";

/** Agency money (won value) is in AED, as on the web's agency area. */
export const AGENCY_CURRENCY = "AED";

/** Fewer lead credits than this: running low (same as the web's client health). */
export const LOW_CREDITS = 50;
/** Not signed in for this long: quiet. */
export const QUIET_MS = 14 * 24 * 60 * 60 * 1000;

/** The business first, then the owner. */
export function clientName(c: Pick<ClientRow, "business_name" | "name" | "email">): string {
  return c.business_name?.trim() || c.name?.trim() || c.email;
}

export type ClientState = "trash" | "paused" | "suspended" | "invited" | "active";

/** Pure: the one state a client row shows (most serious first). */
export function clientState(c: Pick<ClientRow, "in_trash" | "paused" | "suspended" | "active">): ClientState {
  if (c.in_trash) return "trash";
  if (c.paused) return "paused";
  if (c.suspended) return "suspended";
  if (!c.active) return "invited";
  return "active";
}

export type HealthState = "healthy" | "risk" | "waiting";
export type HealthReason = "invite" | "lowCredits" | "quiet" | "neverSignedIn" | "noCampaigns" | "ok";

/** Pure: how a client is doing (the web's Client health card, same rules). */
export function healthOf(c: ClientRow, now: number): { state: HealthState; reason: HealthReason } {
  if (!c.active) return { state: "waiting", reason: "invite" };
  if (c.credits_balance < LOW_CREDITS) return { state: "risk", reason: "lowCredits" };
  if (!c.last_active_at) return { state: "risk", reason: "neverSignedIn" };
  if (now - Date.parse(c.last_active_at) > QUIET_MS) return { state: "risk", reason: "quiet" };
  if (!c.campaigns_active) return { state: "risk", reason: "noCampaigns" };
  return { state: "healthy", reason: "ok" };
}

/** Pure: counts per health state and the clients that need the agency, worst first. Suspended / paused / Trash are left out. */
export function clientHealth(clients: readonly ClientRow[], now: number) {
  const live = clients.filter((c) => !c.suspended && !c.paused && !c.in_trash);
  const rated = live.map((c) => ({ client: c, ...healthOf(c, now) }));
  const order: Record<HealthState, number> = { risk: 0, waiting: 1, healthy: 2 };
  const needs = rated.filter((r) => r.state !== "healthy").sort((a, b) => order[a.state] - order[b.state]);
  return {
    healthy: rated.filter((r) => r.state === "healthy").length,
    risk: rated.filter((r) => r.state === "risk").length,
    waiting: rated.filter((r) => r.state === "waiting").length,
    needs,
  };
}

/** Pure: a number's change against the previous period, in the shape the app's KPI tiles use. */
function change(now: number, prev: number | undefined): Pick<KpiMetric, "changePct" | "changeKind" | "previous"> {
  if (prev == null) return { changePct: null, changeKind: "none", previous: 0 };
  if (prev === 0) return { changePct: null, changeKind: now > 0 ? "new" : "none", previous: 0 };
  if (now === 0) return { changePct: -100, changeKind: "gone", previous: prev };
  return { changePct: ((now - prev) / prev) * 100, changeKind: "pct", previous: prev };
}

type ReportKey = keyof Pick<ReportRated, "leads" | "sent" | "replies" | "meetings" | "deals_won" | "won_value">;

/** The results the agency home shows, in order, with the app's KPI keys (they pick each tile's icon). */
const METRICS: { field: ReportKey; key: string; label: string; kind: KpiMetric["kind"] }[] = [
  { field: "won_value", key: "won", label: "agency.kpi.wonValue", kind: "currency" },
  { field: "leads", key: "leads_found", label: "agency.kpi.leads", kind: "count" },
  { field: "sent", key: "contacted", label: "agency.kpi.sent", kind: "count" },
  { field: "replies", key: "positive_replies", label: "agency.kpi.replies", kind: "count" },
  { field: "meetings", key: "meetings", label: "agency.kpi.meetings", kind: "count" },
  { field: "deals_won", key: "deals_won", label: "agency.kpi.dealsWon", kind: "count" },
];

/** Pure: the report's totals as KPI metrics. `label` translates each label key. */
export function reportMetrics(report: Pick<AgencyReport, "totals">, label: (key: string) => string): KpiMetric[] {
  const t = report.totals;
  return METRICS.map((m) => ({ key: m.key, label: label(m.label), value: t[m.field], kind: m.kind, ...change(t[m.field], t.previous?.[m.field]) }));
}

/** Pure: the clients with the most replies in the period (the home's "Top clients"). */
export function topClients(report: Pick<AgencyReport, "clients">, n = 3): AgencyReport["clients"] {
  return [...report.clients].filter((c) => c.replies > 0 || c.won_value > 0 || c.meetings > 0).sort((a, b) => b.replies - a.replies || b.won_value - a.won_value).slice(0, n);
}

/** Pure: whole credits from a typed amount ("1,500" → 1500); null when not a positive whole number. */
export function parseCredits(text: string): number | null {
  const digits = text.replace(/[\s,._]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}

/** Buying credits: multiples of 1,000, from 1,000 to 5,000,000 (backend services/agencyBilling/buyCredits.service.ts). */
export const BUY_STEP = 1000;
export const BUY_MAX = 5_000_000;
export const BUY_OPTIONS = [1000, 5000, 10000, 25000] as const;

/** Pure: what `credits` cost at the platform price (in the smallest unit, e.g. fils). */
export function creditsPrice(credits: number, centsPer1000: number): number {
  return Math.round((credits / 1000) * centsPer1000);
}

/** A fresh idempotency key for one purchase (the same key never charges twice). */
export function newRequestKey(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Pure: the rows that belong to this agency. */
export function agencyAlertsOf(rows: readonly NotificationRow[], agencyId: number): NotificationRow[] {
  return rows.filter((n) => Number(n.metadata?.agency_id) === agencyId || agencyIdInLink(n.metadata?.action_url) === agencyId);
}

/** Pure: "/agency/12/billing" → 12 (older rows carry only the link). */
export function agencyIdInLink(href: string | null | undefined): number | null {
  const m = href?.match(/^(?:https?:\/\/[^/]+)?\/agency\/(\d+)(?:\/|$|\?)/);
  const id = m ? Number(m[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Pure: which agency screen a link opens ("/agency/12/billing" → "billing"). */
export function agencyScreenInLink(href: string | null | undefined): "billing" | "clients" | "credits" | "team" | "home" | null {
  const m = href?.match(/\/agency\/\d+(?:\/([a-z-]+))?/);
  if (!m) return null;
  const page = m[1];
  if (!page) return "home";
  if (page === "billing" || page === "setup") return "billing";
  if (page === "clients" || page === "signup") return "clients";
  if (page === "credits" || page === "usage") return "credits";
  if (page === "team") return "team";
  return "home";
}

/** Pure: the agency to open — the remembered one if the person is still in it, else their first. */
export function pickAgency(remembered: number | null, agencies: readonly { id: number }[]): number | null {
  if (remembered != null && agencies.some((a) => a.id === remembered)) return remembered;
  return agencies[0]?.id ?? null;
}

/** Pure: where a signed-in person lands when nothing is decided yet. */
export function initialMode(agencies: number): "agency" | "workspace" {
  return agencies > 0 ? "agency" : "workspace";
}
