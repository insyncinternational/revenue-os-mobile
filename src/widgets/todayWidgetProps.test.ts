import { palettes } from "@/theme/tokens";
import { signedOutWidgetProps, todayWidgetProps, widgetColors } from "./todayWidgetProps";

const labels = { replies: "Replies", calls_due: "Calls due", meetings: "Meetings" };
const counter = (key: string, count: number, label = "") => ({ key, count, label, href: "/", urgent: false });

describe("todayWidgetProps", () => {
  it("shows the hero's three counters in order, with server labels when given", () => {
    const p = todayWidgetProps({
      workspace: "Harbor Bakery",
      counters: [counter("meetings", 2, "Meetings today"), counter("hot_leads", 9), counter("replies", 1)],
      next: "Reply to Nina",
      updated: "Updated 1:34 PM",
      fallbackLabels: labels,
      palette: palettes.light,
    });
    expect(p.signedIn).toBe(true);
    expect(p.title).toBe("Harbor Bakery");
    expect(p.stats).toEqual([
      { count: 1, label: "Replies" },
      { count: 0, label: "Calls due" },
      { count: 2, label: "Meetings today" },
    ]);
    expect(p.next).toBe("Reply to Nina");
  });

  it("signed out keeps no numbers", () => {
    const p = signedOutWidgetProps({ title: "GrowthReach.ai", hint: "Sign in", palette: palettes.light });
    expect(p).toMatchObject({ signedIn: false, stats: [], next: "", subtitle: "Sign in" });
  });
});

describe("widgetColors", () => {
  it("flattens the hero's translucent colours into opaque hex", () => {
    const c = widgetColors(palettes.light);
    for (const v of Object.values(c)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.bg).toBe(palettes.light.heroFrom);
    expect(c.tile).not.toBe(c.bg);
  });
});
