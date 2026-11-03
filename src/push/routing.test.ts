import { conversationIdOf, routeForPush } from "./routing";

describe("routeForPush", () => {
  it("opens the exact conversation when the push names one", () => {
    expect(routeForPush({ base_id: 4, inbox_item_id: "email:12", action_url: "/bases/4/inbox?item=email:12" })).toEqual({ baseId: 4, conversation: "email:12", meeting: null, approval: null, deal: null, task: null, contact: null, link: "/inbox" });
    expect(routeForPush({ conversation_id: "website-chat:3" }).conversation).toBe("website-chat:3");
  });
  it("follows the action link when there is no conversation", () => {
    expect(routeForPush({ base_id: 4, action_url: "/bases/4/inbox" })).toEqual({ baseId: 4, conversation: null, meeting: null, approval: null, deal: null, task: null, contact: null, link: "/inbox" });
    expect(routeForPush({ deal_id: 9, action_url: "/campaigns/2" }).link).toBe("/pipeline");
    expect(routeForPush({ lead_id: 5 }).link).toBe("/contacts");
  });
  it("opens the exact meeting, from its id or its web link", () => {
    expect(routeForPush({ base_id: 4, meeting_id: 51 })).toEqual({ baseId: 4, conversation: null, meeting: 51, approval: null, deal: null, task: null, contact: null, link: "/calendar" });
    expect(routeForPush({ action_url: "/meetings?meeting=7" }).meeting).toBe(7);
    expect(routeForPush({ task_id: 3 }).link).toBe("/tasks");
  });
  it("opens the AI draft to approve, unless it's a hand-off with a conversation", () => {
    expect(routeForPush({ base_id: 4, lead_id: 9, pending_action_id: 77, action_url: "/ai-sdr" })).toEqual({ baseId: 4, conversation: null, meeting: null, approval: 77, deal: null, task: null, contact: null, link: "/approvals" });
    expect(routeForPush({ pending_action_id: 77, conversation_id: "email:5" }).approval).toBeNull();
    expect(routeForPush({ action_url: "/ai-sdr" }).link).toBe("/approvals");
  });
  it("always lands somewhere useful", () => {
    expect(routeForPush({ category: "billing" })).toEqual({ baseId: null, conversation: null, meeting: null, approval: null, deal: null, task: null, contact: null, link: "/notifications" });
    expect(routeForPush(null).link).toBe("/notifications");
  });
  it("ignores a junk workspace id and numeric chat ids", () => {
    expect(routeForPush({ base_id: -1, lead_id: 2 }).baseId).toBeNull();
    expect(conversationIdOf({ conversation_id: 42 })).toBeNull();
    expect(conversationIdOf({ conversation_id: "nope" })).toBeNull();
  });
  it("opens the record itself: a deal, else a task, else a contact", () => {
    expect(routeForPush({ base_id: 4, deal_id: 9, lead_id: 5 })).toMatchObject({ deal: 9, task: null, contact: null, link: "/pipeline" });
    expect(routeForPush({ task_id: 3, lead_id: 5 })).toMatchObject({ deal: null, task: 3, contact: null });
    expect(routeForPush({ lead_id: 5 })).toMatchObject({ contact: 5, link: "/contacts" });
    // A conversation, meeting or draft is more specific than the contact it belongs to.
    expect(routeForPush({ lead_id: 5, inbox_item_id: "email:1" }).contact).toBeNull();
    expect(routeForPush({ deal_id: 0 }).deal).toBeNull();
  });
});
