import type { AiAgentAction, AiDraft } from "@/types/approvals";
import { approvePayload, confidencePercent, draftLeadName, humanize, isApprovable, mergeApprovals, variantText } from "./approvals";

const draft = (over: Partial<AiDraft> = {}): AiDraft => ({
  id: 1,
  base_id: 4,
  lead_id: 9,
  campaign_id: null,
  channel: "email",
  action_type: "send_message",
  status: "pending",
  confidence: 0.82,
  reason: null,
  skip_reason: "approval_required",
  proposed_subject: "Re: catering",
  proposed_body: "Hi Sara, happy to help.",
  proposed_subject_b: null,
  proposed_body_b: null,
  edited_subject: null,
  edited_body: null,
  content_findings: [],
  error_message: null,
  created_at: "2026-11-01T10:00:00Z",
  proposed_booking: null,
  lead: { id: 9, first_name: "Sara", last_name: "Ahmed", company: "Northwind", email: "s@n.co", phone: null },
  campaign: null,
  classification: null,
  ...over,
});

const action = (over: Partial<AiAgentAction> = {}): AiAgentAction => ({
  id: 5,
  base_id: 4,
  source: "agent",
  agent_id: "crm",
  agent_name: "CRM Agent",
  action_type: "crm_update_deal",
  action_label: "Update deal",
  status: "pending_approval",
  title: "Move deal to Proposal",
  error: null,
  lead_id: null,
  campaign_id: null,
  createdAt: "2026-11-01T11:00:00Z",
  ...over,
});

describe("approvals", () => {
  it("merges drafts and agent actions newest first", () => {
    const items = mergeApprovals([draft()], [action()]);
    expect(items.map((i) => i.key)).toEqual(["a5", "d1"]);
    expect(mergeApprovals(undefined, undefined)).toEqual([]);
  });

  it("names the lead, falling back to company, email, then the given text", () => {
    expect(draftLeadName(draft(), "A lead")).toBe("Sara Ahmed");
    expect(draftLeadName(draft({ lead: { id: 9, first_name: null, last_name: null, company: "Northwind", email: null, phone: null } }), "A lead")).toBe("Northwind");
    expect(draftLeadName(draft({ lead: null }), "A lead")).toBe("A lead");
  });

  it("treats hand-offs and decided drafts as not approvable", () => {
    expect(isApprovable(draft())).toBe(true);
    expect(isApprovable(draft({ action_type: "escalate_human" }))).toBe(false);
    expect(isApprovable(draft({ status: "sent" }))).toBe(false);
  });

  it("starts version A from an earlier edit, version B from its own draft", () => {
    const d = draft({ edited_body: "Edited", proposed_body_b: "Version B", proposed_subject_b: "B subject" });
    expect(variantText(d, "a")).toEqual({ subject: "Re: catering", body: "Edited" });
    expect(variantText(d, "b")).toEqual({ subject: "B subject", body: "Version B" });
    // No version B: asking for it gives A.
    expect(variantText(draft(), "b").body).toBe("Hi Sara, happy to help.");
  });

  it("sends edited text only when it changed, and always for version B", () => {
    const d = draft();
    expect(approvePayload(d, "a", { subject: "Re: catering", body: "Hi Sara, happy to help. " })).toEqual({});
    expect(approvePayload(d, "a", { subject: "Re: catering", body: "Hi Sara!" })).toEqual({ body: "Hi Sara!" });
    const b = draft({ proposed_body_b: "Version B" });
    expect(approvePayload(b, "b", { subject: "Re: catering", body: "Version B" })).toEqual({ body: "Version B", subject: "Re: catering" });
    // WhatsApp has no subject.
    expect(approvePayload(draft({ channel: "whatsapp" }), "a", { subject: "x", body: "Changed" })).toEqual({ body: "Changed" });
  });

  it("humanizes ids and reads confidence", () => {
    expect(humanize("meeting_request")).toBe("Meeting request");
    expect(humanize(null)).toBe("");
    expect(confidencePercent(draft())).toBe(82);
    expect(confidencePercent(draft({ confidence: null }))).toBeNull();
    expect(confidencePercent(draft({ classification: { intent: "interested", confidence: 0.6, reasoning: null } }))).toBe(60);
  });
});
