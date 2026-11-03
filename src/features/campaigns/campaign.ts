/**
 * Campaign numbers as the web's campaign cards show them (revenue-os-frontend lib/campaignsView.ts), so the phone
 * and the web never disagree. Pure — unit tested.
 */
import type { BadgeTone } from "@/ui/Badge";
import type { Campaign, CampaignChannel, CampaignStatus } from "@/types/campaign";

const CHANNEL_ORDER: CampaignChannel[] = ["email", "linkedin", "whatsapp", "call"];

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function campaignChannels(c: Pick<Campaign, "channels" | "channel">): CampaignChannel[] {
  const raw = Array.isArray(c.channels) && c.channels.length ? c.channels : c.channel ? [c.channel] : [];
  const set = new Set(raw.map((x) => String(x).toLowerCase()));
  const out = CHANNEL_ORDER.filter((ch) => set.has(ch));
  return out.length ? out : ["email"];
}

/** A running campaign past its schedule's end counts as completed (the web's getEffectiveCampaignStatus). */
export function campaignStatus(c: Pick<Campaign, "status" | "config">, now = Date.now()): CampaignStatus {
  const end = c.config?.schedule?.end;
  if (c.status === "running" && end && Number.isFinite(Date.parse(end)) && now >= Date.parse(end)) return "completed";
  return c.status === "running" || c.status === "paused" || c.status === "completed" ? c.status : "draft";
}

/** Sends and replies across every channel the campaign uses. */
export function campaignTotals(c: Campaign): { leads: number; sent: number; replies: number; replyRate: number | null } {
  const multi = campaignChannels(c).length > 1;
  const sent = multi && c.aggregate_sent != null ? num(c.aggregate_sent) : num(c.sent);
  const replies = multi && c.aggregate_replied != null ? num(c.aggregate_replied) : num(c.replied);
  return { leads: num(c.leads), sent, replies, replyRate: sent > 0 ? Math.round((replies / sent) * 1000) / 10 : null };
}

/** Share of the audience reached (0–1), null before it starts. */
export function reachedShare(c: Pick<Campaign, "progress">): number | null {
  const p = c.progress;
  if (!p || p.state === "draft" || p.audience <= 0) return null;
  return Math.min(1, p.reached / p.audience);
}

/** The safety guard stopped it (bounces, limits): resuming needs a look on the web first. */
export function guardPaused(c: Pick<Campaign, "progress">): boolean {
  return c.progress?.state === "guard_paused";
}

export const STATUS_TONE: Record<CampaignStatus, BadgeTone> = { running: "success", paused: "warning", draft: "neutral", completed: "info" };

const RANK: Record<CampaignStatus, number> = { running: 0, paused: 1, completed: 2, draft: 3 };

/** Live ones first (running, then paused), newest first within each; archived ones never. */
export function sortCampaigns(list: Campaign[], now = Date.now()): Campaign[] {
  return list
    .filter((c) => !c.archived_at)
    .slice()
    .sort((a, b) => RANK[campaignStatus(a, now)] - RANK[campaignStatus(b, now)] || (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0));
}
