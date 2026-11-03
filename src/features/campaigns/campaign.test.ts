import type { Campaign } from "@/types/campaign";
import { campaignChannels, campaignStatus, campaignTotals, guardPaused, reachedShare, sortCampaigns } from "./campaign";

const c = (over: Partial<Campaign> = {}): Campaign => ({ id: 1, name: "Spring offer", status: "running", channels: ["email"], leads: 120, sent: 80, replied: 6, ...over });

describe("campaigns", () => {
  it("orders channels and defaults to email", () => {
    expect(campaignChannels({ channels: ["whatsapp", "email"] })).toEqual(["email", "whatsapp"]);
    expect(campaignChannels({ channel: "linkedin" })).toEqual(["linkedin"]);
    expect(campaignChannels({})).toEqual(["email"]);
  });

  it("treats a running campaign past its end date as completed", () => {
    const now = Date.parse("2026-11-01T12:00:00Z");
    expect(campaignStatus(c({ config: { schedule: { end: "2026-10-31T00:00:00Z" } } }), now)).toBe("completed");
    expect(campaignStatus(c(), now)).toBe("running");
    expect(campaignStatus(c({ status: "weird" }), now)).toBe("draft");
  });

  it("totals across channels like the web", () => {
    expect(campaignTotals(c())).toEqual({ leads: 120, sent: 80, replies: 6, replyRate: 7.5 });
    expect(campaignTotals(c({ channels: ["email", "whatsapp"], aggregate_sent: "100", aggregate_replied: 10 })).sent).toBe(100);
    expect(campaignTotals(c({ sent: 0, replied: 0 })).replyRate).toBeNull();
  });

  it("reads reach and the safety guard", () => {
    expect(reachedShare(c({ progress: { reached: 30, audience: 120, state: "sending", next_send_at: null, reason: null } }))).toBe(0.25);
    expect(reachedShare(c({ progress: null }))).toBeNull();
    expect(guardPaused(c({ progress: { reached: 0, audience: 1, state: "guard_paused", next_send_at: null, reason: "bounces" } }))).toBe(true);
  });

  it("puts live campaigns first and hides archived ones", () => {
    const list = sortCampaigns([c({ id: 1, status: "draft" }), c({ id: 2, status: "paused" }), c({ id: 3 }), c({ id: 4, archived_at: "2026-10-01" })]);
    expect(list.map((x) => x.id)).toEqual([3, 2, 1]);
  });
});
