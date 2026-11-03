/**
 * The backend writes links for the web app ("/bases/12/inbox?item=email:5", "/crm", "/leads/7"). This maps the
 * ones the app has a screen for; anything else returns null and the UI shows no button rather than a dead end.
 * Pure — unit tested. Extended as each milestone adds screens.
 */
export type AppLink = "/inbox" | "/contacts" | "/contacts?view=phone" | "/pipeline" | "/calendar" | "/tasks" | "/notifications" | "/approvals";

function parts(webHref: string): { path: string; query: URLSearchParams } {
  const [rawPath = "", rawQuery = ""] = webHref.split("#")[0]!.split("?");
  const path = rawPath.replace(/^\/bases\/\d+/, "").replace(/\/+$/, "") || "/";
  return { path, query: new URLSearchParams(rawQuery) };
}

export function appLinkFor(webHref: string | null | undefined): AppLink | null {
  if (!webHref) return null;
  const { path, query } = parts(webHref);
  if (path === "/inbox" || path.startsWith("/inbox/")) return "/inbox";
  if (path === "/leads" || path.startsWith("/leads/") || path === "/contacts") return "/contacts";
  // The web's calling queue: on the phone, the contacts you can call.
  if (path === "/calls/queue") return "/contacts?view=phone";
  if (path === "/meetings" || path.startsWith("/meetings/") || path === "/calendar") return "/calendar";
  if (path === "/tasks" || ((path === "/crm" || path.startsWith("/crm/")) && query.get("tab") === "tasks")) return "/tasks";
  if (path === "/crm" || path.startsWith("/crm/") || path === "/pipeline") return "/pipeline";
  if (path === "/notifications") return "/notifications";
  if (path === "/ai-sdr" || path.startsWith("/ai-sdr/")) return "/approvals";
  return null;
}

/**
 * The conversation a web inbox link points at, if any: "?item=email:12" → "email:12", and the email-thread form the
 * day plan uses, "?thread=12" → "email:12".
 */
export function conversationIdIn(webHref: string | null | undefined): string | null {
  if (!webHref) return null;
  const { path, query } = parts(webHref);
  if (!(path === "/inbox" || path.startsWith("/inbox/"))) return null;
  const id = query.get("item");
  if (id && /^[a-z-]+:[\w-]+$/.test(id)) return id;
  const thread = query.get("thread");
  return thread && /^\d+$/.test(thread) ? `email:${thread}` : null;
}

/** The meeting a web link points at ("/meetings?meeting=12", "/meetings/room/12"), if any. */
export function meetingIdIn(webHref: string | null | undefined): number | null {
  if (!webHref) return null;
  const { path, query } = parts(webHref);
  if (!(path === "/meetings" || path.startsWith("/meetings/"))) return null;
  const id = Number(query.get("meeting") ?? path.match(/^\/meetings\/room\/(\d+)$/)?.[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
