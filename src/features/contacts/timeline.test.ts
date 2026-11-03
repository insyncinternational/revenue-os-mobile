import { eventTitle } from "./timelineEvent";

describe("timeline event titles", () => {
  it("names a campaign event instead of showing its bare type", () => {
    expect(eventTitle({ source: "campaign", type: "sent", subject: "sent" })).toEqual({ key: "timeline.campaignSent" });
    expect(eventTitle({ source: "campaign", type: "bounced", subject: "bounced" })).toEqual({ key: "timeline.campaignBounced" });
    // An unknown campaign type still reads as words, not the raw repeat.
    expect(eventTitle({ source: "campaign", type: "unsubscribed", subject: "unsubscribed" })).toEqual({ text: "Unsubscribed" });
  });

  it("keeps real subjects, else names the type", () => {
    expect(eventTitle({ source: "activity", type: "invoice_paid", subject: "Invoice INV-0001 paid (AED 1,208.03)" })).toEqual({ text: "Invoice INV-0001 paid (AED 1,208.03)" });
    expect(eventTitle({ source: "activity", type: "note", subject: null })).toEqual({ key: "timeline.note" });
    expect(eventTitle({ source: "activity", type: "whatsapp_message", subject: " " })).toEqual({ key: "timeline.whatsapp" });
    expect(eventTitle({ source: "activity", type: "stage_change", subject: null })).toEqual({ text: "Stage change" });
  });
});
