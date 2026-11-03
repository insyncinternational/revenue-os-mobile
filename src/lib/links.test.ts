import { appLinkFor, conversationIdIn, meetingIdIn } from "./links";

describe("conversationIdIn", () => {
  it("reads the conversation from a web inbox link", () => {
    expect(conversationIdIn("/bases/3/inbox?item=email:12")).toBe("email:12");
    expect(conversationIdIn("/inbox?item=website-chat:7")).toBe("website-chat:7");
    expect(conversationIdIn("/inbox?thread=5")).toBe("email:5");
    expect(conversationIdIn("/inbox?thread=abc")).toBeNull();
    expect(conversationIdIn("/inbox")).toBeNull();
    expect(conversationIdIn("/crm?item=email:1")).toBeNull();
  });
});

describe("appLinkFor", () => {
  it("maps web links the app has screens for", () => {
    expect(appLinkFor("/bases/12/inbox?item=email%3A5")).toBe("/inbox");
    expect(appLinkFor("/inbox")).toBe("/inbox");
    expect(appLinkFor("/leads/7")).toBe("/contacts");
    expect(appLinkFor("/calls/queue")).toBe("/contacts?view=phone");
    expect(appLinkFor("/bases/3/crm?tab=deals")).toBe("/pipeline");
    expect(appLinkFor("/crm?tab=pipeline")).toBe("/pipeline");
    expect(appLinkFor("/crm?tab=tasks")).toBe("/tasks");
    expect(appLinkFor("/meetings")).toBe("/calendar");
    expect(appLinkFor("/meetings?meeting=12")).toBe("/calendar");
    expect(appLinkFor("/notifications")).toBe("/notifications");
  });
  it("returns null for screens the app doesn't have", () => {
    expect(appLinkFor("/campaigns/new")).toBeNull();
    expect(appLinkFor("/bases/12/workflows")).toBeNull();
    expect(appLinkFor("")).toBeNull();
    expect(appLinkFor(null)).toBeNull();
  });
});

describe("meetingIdIn", () => {
  it("finds the meeting a link opens", () => {
    expect(meetingIdIn("/meetings?meeting=12")).toBe(12);
    expect(meetingIdIn("/bases/4/meetings/room/9")).toBe(9);
    expect(meetingIdIn("/meetings")).toBeNull();
    expect(meetingIdIn("/crm?meeting=12")).toBeNull();
    expect(meetingIdIn(null)).toBeNull();
  });
});
