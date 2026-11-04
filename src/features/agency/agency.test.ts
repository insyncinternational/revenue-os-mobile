import type { ClientRow } from "@/types/agency";
import { agencyAlertsOf, agencyIdInLink, agencyScreenInLink, clientHealth, clientName, initialMode, pickAgency, clientState, creditsPrice, healthOf, LOW_CREDITS, parseCredits, QUIET_MS, reportMetrics, topClients } from "./agency";

const NOW = Date.parse("2026-11-04T12:00:00Z");

function client(over: Partial<ClientRow> = {}): ClientRow {
  return {
    id: 1,
    name: "Sara Owner",
    business_name: "Bloom Physio",
    email: "sara@example.test",
    owner_user_id: 10,
    workspaces: 1,
    leads: 20,
    deals_open: 2,
    deals_won_value: 1000,
    campaigns_active: 1,
    credits_balance: 500,
    ai_tokens_balance: 0,
    last_active_at: new Date(NOW - 60_000).toISOString(),
    suspended: false,
    active: true,
    ...over,
  };
}

describe("clientName / clientState", () => {
  it("shows the business first, then the owner, then the email", () => {
    expect(clientName(client())).toBe("Bloom Physio");
    expect(clientName(client({ business_name: "  " }))).toBe("Sara Owner");
    expect(clientName(client({ business_name: null, name: "" }))).toBe("sara@example.test");
  });

  it("picks the most serious state", () => {
    expect(clientState(client())).toBe("active");
    expect(clientState(client({ active: false }))).toBe("invited");
    expect(clientState(client({ suspended: true, active: false }))).toBe("suspended");
    expect(clientState(client({ paused: true, suspended: true }))).toBe("paused");
    expect(clientState(client({ in_trash: true, paused: true }))).toBe("trash");
  });
});

describe("client health (same rules as the web)", () => {
  it("rates each client", () => {
    expect(healthOf(client(), NOW)).toEqual({ state: "healthy", reason: "ok" });
    expect(healthOf(client({ active: false }), NOW).reason).toBe("invite");
    expect(healthOf(client({ credits_balance: LOW_CREDITS - 1 }), NOW).reason).toBe("lowCredits");
    expect(healthOf(client({ last_active_at: null }), NOW).reason).toBe("neverSignedIn");
    expect(healthOf(client({ last_active_at: new Date(NOW - QUIET_MS - 1).toISOString() }), NOW).reason).toBe("quiet");
    expect(healthOf(client({ campaigns_active: 0 }), NOW).reason).toBe("noCampaigns");
  });

  it("counts states, lists who needs the agency worst first, and leaves out paused / suspended / Trash", () => {
    const h = clientHealth(
      [client({ id: 1 }), client({ id: 2, active: false }), client({ id: 3, credits_balance: 0 }), client({ id: 4, paused: true }), client({ id: 5, in_trash: true }), client({ id: 6, suspended: true })],
      NOW
    );
    expect([h.healthy, h.risk, h.waiting]).toEqual([1, 1, 1]);
    expect(h.needs.map((n) => n.client.id)).toEqual([3, 2]);
  });
});

describe("reportMetrics", () => {
  const totals = { leads: 10, sent: 0, replies: 4, meetings: 2, deals_won: 1, won_value: 500, reply_rate_pct: 40 };

  it("maps totals to KPI tiles with their changes", () => {
    const m = reportMetrics({ totals: { ...totals, previous: { ...totals, leads: 5, sent: 3, replies: 0, won_value: 500 } } }, (k) => k);
    const by = Object.fromEntries(m.map((x) => [x.key, x]));
    expect(by.won).toMatchObject({ kind: "currency", value: 500, changeKind: "pct", changePct: 0 });
    expect(by.leads_found).toMatchObject({ value: 10, changeKind: "pct", changePct: 100 });
    expect(by.contacted).toMatchObject({ value: 0, changeKind: "gone" });
    expect(by.positive_replies).toMatchObject({ changeKind: "new" });
    expect(by.won?.label).toBe("agency.kpi.wonValue");
  });

  it("shows no change without a previous period", () => {
    expect(reportMetrics({ totals }, (k) => k).every((x) => x.changeKind === "none")).toBe(true);
  });
});

describe("topClients", () => {
  it("skips clients with nothing, sorts by replies then won value", () => {
    const row = (id: number, replies: number, won_value: number) => ({ id, name: `C${id}`, leads: 0, sent: 0, replies, meetings: 0, deals_won: 0, won_value, reply_rate_pct: null });
    expect(topClients({ clients: [row(1, 0, 0), row(2, 3, 0), row(3, 3, 900), row(4, 9, 0)] }).map((c) => c.id)).toEqual([4, 3, 2]);
  });
});

describe("credits", () => {
  it("reads typed amounts", () => {
    expect(parseCredits("1,500")).toBe(1500);
    expect(parseCredits(" 2 000 ")).toBe(2000);
    expect(parseCredits("0")).toBeNull();
    expect(parseCredits("-5")).toBeNull();
    expect(parseCredits("1.5k")).toBeNull();
  });

  it("prices credits at the platform rate", () => {
    expect(creditsPrice(5000, 7500)).toBe(37500);
    expect(creditsPrice(1000, 7500)).toBe(7500);
  });
});

describe("agency alert links", () => {
  it("finds the agency and the screen", () => {
    expect(agencyIdInLink("/agency/12/billing")).toBe(12);
    expect(agencyIdInLink("https://app.example.test/agency/7/clients?x=1")).toBe(7);
    expect(agencyIdInLink("/agency/12")).toBe(12);
    expect(agencyIdInLink("/agencyx/12")).toBeNull();
    expect(agencyIdInLink("/bases/3/inbox")).toBeNull();
    expect(agencyScreenInLink("/agency/12/billing")).toBe("billing");
    expect(agencyScreenInLink("/agency/12/clients")).toBe("clients");
    expect(agencyScreenInLink("/agency/12/usage")).toBe("credits");
    expect(agencyScreenInLink("/agency/12")).toBe("home");
    expect(agencyScreenInLink("/inbox")).toBeNull();
  });

  it("keeps only this agency's alerts", () => {
    const n = (id: number, metadata: Record<string, unknown>) => ({ id, type: "x", title: "t", message: null, category: "billing" as const, metadata, base_id: null, read_at: null, created_at: "" });
    const rows = [n(1, { agency_id: 5 }), n(2, { agency_id: 6 }), n(3, { action_url: "/agency/5/billing" }), n(4, {})];
    expect(agencyAlertsOf(rows, 5).map((r) => r.id)).toEqual([1, 3]);
  });
});

describe("mode", () => {
  it("opens the remembered agency while still a member, else the first", () => {
    expect(pickAgency(7, [{ id: 3 }, { id: 7 }])).toBe(7);
    expect(pickAgency(9, [{ id: 3 }, { id: 7 }])).toBe(3);
    expect(pickAgency(null, [])).toBeNull();
  });

  it("starts agency members in their agency", () => {
    expect(initialMode(2)).toBe("agency");
    expect(initialMode(0)).toBe("workspace");
  });
});
