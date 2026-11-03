/**
 * Contract check: calls every backend endpoint the app uses and verifies the fields the app reads are still
 * there, with the right types. The web and backend change continuously in other sessions — run this after
 * each milestone (and whenever the backend moves) so a renamed or dropped field shows up here, not as a
 * broken screen.
 *
 *   CONTRACT_EMAIL=… CONTRACT_PASSWORD=… npm run contract
 *   (optional) EXPO_PUBLIC_API_URL=http://localhost:4000
 *
 * Shapes mirror src/types/*.ts. "?" = may be null/absent; "[]" = array whose items are checked.
 */
const API = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "") + "/api";
const EMAIL = process.env.CONTRACT_EMAIL;
const PASSWORD = process.env.CONTRACT_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set CONTRACT_EMAIL and CONTRACT_PASSWORD (a local test account).");
  process.exit(2);
}

const user = { id: "number", email: "string", name: "string", "branding?": { source: "string", name: "string", "primary_color?": "string" } };

const SHAPES = {
  login: { token: "string", "expires_at?": "string", user },
  config: { min_app_version: "string", "websocket_url?": "string" },
  bases: { bases: [{ id: "number", name: "string", user_id: "number", "access?": "string" }] },
  access: {
    workspace: { id: "number", "name?": "string" },
    role: "string",
    source: "string",
    "client?": { id: "number", name: "string" },
    "agency?": { id: "number", role: "string" },
    branding: { source: "string", name: "string" },
    locked_modules: ["string"],
    capabilities: {
      inbox_read: "boolean", inbox_reply: "boolean", inbox_manage: "boolean", contacts_read: "boolean", contacts_create: "boolean",
      contacts_edit: "boolean", deals_money: "boolean", deals_edit: "boolean", tasks_create: "boolean", meetings_read: "boolean",
      meetings_edit: "boolean", calls_log: "boolean", invoices_read: "boolean", invoices_edit: "boolean",
    },
  },
  home: {
    base_id: "number",
    "kpis?": { metrics: [{ key: "string", label: "string", value: "number", kind: "string", "changePct?": "number", changeKind: "string" }], currency: "string" },
    "my_day?": { counters: [{ key: "string", label: "string", count: "number", href: "string", urgent: "boolean" }], headline: "string" },
    "conversations?": [{ item_id: "string", channel: "string", contact_name: "string", preview: "string", unread: "boolean", "last_message_at?": "string" }],
    "meetings?": [{ task_id: "number", title: "string", "due_at?": "string", "join_url?": "string", "contact_name?": "string" }],
    "pipeline?": { bars: [{ stage_id: "number", label: "string", count: "number", value: "number" }], total_value: "number", currency: "string" },
    "recommendations?": [{ key: "string", text: "string", action: "string", href: "string", tone: "string" }],
    "focus_prospect?": { lead_id: "number", name: "string", intent: "string", signals: [{ id: "number", title: "string" }], recommended_action: { kind: "string", label: "string", reason: "string" } },
  },
  plan: { items: [{ id: "string", kind: "string", title: "string", reason: "string", actions: [{ kind: "string", label: "string" }] }], headline: "string" },
  notifications: { notifications: [{ id: "number", title: "string", "message?": "string", "category?": "string", "read_at?": "string", created_at: "string" }], unread_count: "number", has_more: "boolean" },
  unread: { unread_count: "number" },
  agencies: { agencies: [{ id: "number", name: "string", role: "string" }], is_platform_admin: "boolean" },
  inbox: {
    items: [{ id: "string", channel: "string", contact_label: "string", "contact_email?": "string", "preview?": "string", "last_message_at?": "string", unread_count: "number", can_reply: "boolean", assignee_user_ids: ["number"] }],
    total: "number",
    unread_counts: { all: "number", email: "number", whatsapp: "number", sms: "number", website_chat: "number" },
    assignment_counts: { mine: "number", unassigned: "number" },
  },
  conversation: {
    item: { id: "string", channel: "string", contact_label: "string", can_reply: "boolean", unread_count: "number" },
    messages: [{ id: "string", direction: "string", "body_text?": "string", created_at: "string", message_kind: "string" }],
  },
  inboxUnread: { count: "number" },
  contacts: {
    leads: [{ id: "number", "first_name?": "string", "last_name?": "string", "email?": "string", "phone?": "string", "company?": "string", "role?": "string", "last_activity_at?": "string" }],
    pagination: { total: "number", page: "number", limit: "number", hasNextPage: "boolean" },
  },
  contact: { id: "number", "first_name?": "string", "email?": "string", "phone?": "string", "company?": "string" },
  timeline: { timeline: [{ type: "string", occurred_at: "string", "subject?": "string", "body?": "string", "user?": { "name?": "string" } }] },
  contactTasks: { tasks: [{ id: "number", title: "string", status: "string", "due_at?": "string" }] },
  // Deal amounts are SQL DECIMALs sent as strings; src/api/pipeline.ts (numericAmount) converts them.
  contactDeals: { deals: [{ id: "number", name: "string", status: "string", "amount?": "string", "stage?": { name: "string" } }] },
  crmBootstrap: {
    stages: [{ id: "number", name: "string", sort_order: "number", is_won: "boolean", is_lost: "boolean", "probability?": "number", "color?": "string", "rotting_days?": "number" }],
    lost_reasons: ["string"],
    members: [{ id: "number", email: "string" }],
    settings: { default_currency: "string" },
  },
  pipelines: { pipelines: [{ id: "number", name: "string", is_default: "boolean" }] },
  board: {
    pipeline_id: "number",
    stages: [{ id: "number", name: "string", is_won: "boolean", is_lost: "boolean" }],
    dealsByStage: "object",
    stage_totals: "object",
    per_stage_limit: "number",
  },
  deal: {
    deal: {
      id: "number",
      name: "string",
      status: "string",
      "amount?": "string",
      "currency?": "string",
      "stage_id?": "number",
      "probability?": "number",
      "expected_close_date?": "string",
      "stage_entered_at?": "string",
      "stage?": { id: "number", name: "string" },
      "lead?": { id: "number" },
      "owner?": { id: "number", email: "string" },
    },
  },
  dealTimeline: { timeline: [{ type: "string", occurred_at: "string" }] },
  dealTasks: { tasks: [{ id: "number", title: "string", status: "string" }] },
  tasks: {
    tasks: [
      {
        id: "number",
        title: "string",
        status: "string",
        "task_type?": "string",
        "priority?": "string",
        "due_at?": "string",
        "lead_id?": "number",
        "assignees?": [{ id: "number" }],
        // Added for the app (backend withTaskContacts): null when the task isn't about a contact.
        "lead?": { id: "number", "first_name?": "string", "last_name?": "string", "company?": "string" },
      },
    ],
    total: "number",
    has_more: "boolean",
  },
  meetingsSummary: { today: "number", next_7_days: "number", upcoming: "number", needs_outcome: "number" },
  meetings: {
    meetings: [
      {
        id: "number",
        title: "string",
        status: "string",
        "due_at?": "string",
        "lead_id?": "number",
        "contact_name?": "string",
        owner_ids: ["number"],
        owners: [{ id: "number" }],
        reminder_state: "string",
        "outcome?": "string",
        "join_url?": "string",
        "manage_url?": "string",
        source: "string",
      },
    ],
    has_more: "boolean",
  },
  meetingRange: { meetings: [{ id: "number", title: "string", status: "string" }], truncated: "boolean" },
  meeting: { meeting: { id: "number", title: "string", status: "string", owners: [{ id: "number" }], reminder_state: "string", source: "string" } },
  invoices: {
    invoices: [
      {
        id: "number",
        number: "string",
        status: "string",
        currency: "string",
        total_cents: "number",
        amount_paid_cents: "number",
        "customer_name?": "string",
        "customer_email?": "string",
        "due_date?": "string",
        pay_url: "string",
        items: [{ id: "number", name: "string", quantity: "number", unit_price_cents: "number", amount_cents: "number" }],
      },
    ],
    summary: { draft: "number", open: "number", overdue: "number", paid: "number", outstanding: "object", collected: "object" },
  },
  invoice: { invoice: { id: "number", number: "string", status: "string", total_cents: "number", pay_url: "string", items: "array" } },
  payments: { charges_enabled: "boolean", connected: "boolean" },
  inboxContext: {
    "lead?": { id: "number", name: "string", "email?": "string", "phone?": "string", "company?": "string", "role?": "string", "score?": "number", "tier?": "string" },
    deals: [{ id: "number", name: "string", "stage?": "string" }],
    channels: [{ channel: "string", last_contacted_at: "string" }],
  },
  notifPrefs: { categories: [{ id: "string", label: "string", description: "string", email: "boolean", push: "boolean" }] },
};

/** Returns a list of "path: problem" strings. */
function check(value, shape, path = "$") {
  if (typeof shape === "string") {
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    return actual === shape ? [] : [`${path}: expected ${shape}, got ${actual}`];
  }
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [`${path}: expected array, got ${value === null ? "null" : typeof value}`];
    return value.slice(0, 5).flatMap((v, i) => check(v, shape[0], `${path}[${i}]`));
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${path}: expected object`];
  return Object.entries(shape).flatMap(([rawKey, sub]) => {
    const optional = rawKey.endsWith("?");
    const key = optional ? rawKey.slice(0, -1) : rawKey;
    const v = value[key];
    if (v === undefined || v === null) return optional ? [] : [`${path}.${key}: missing`];
    return check(v, sub, `${path}.${key}`);
  });
}

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  return { status: res.status, json };
}

const results = [];
async function verify(name, method, path, token, body) {
  const r = await call(method, path, token, body).catch((e) => ({ status: 0, json: null, error: e.message }));
  const problems = r.status >= 200 && r.status < 300 ? check(r.json, SHAPES[name]) : [`HTTP ${r.status}${r.error ? ` (${r.error})` : ""}`];
  results.push({ name, path, problems });
  return r.json;
}

const login = await verify("login", "POST", "/mobile/auth/login", null, { email: EMAIL, password: PASSWORD });
const token = login?.token;
if (!token) {
  console.error("Sign-in failed — can't check the rest.", results[0]?.problems);
  process.exit(1);
}
try {
  await verify("config", "GET", "/mobile/config");
  const bases = await verify("bases", "GET", "/bases", token);
  // CONTRACT_BASE_ID picks a workspace with data (e.g. an agency client's); default: the first own workspace.
  const baseId = Number(process.env.CONTRACT_BASE_ID) || bases?.bases?.[0]?.id;
  if (baseId) {
    await verify("access", "GET", `/mobile/access?base_id=${baseId}`, token);
    await verify("home", "GET", `/home?base_id=${baseId}&since_days=30`, token);
    await verify("plan", "GET", `/home/my-day/plan?base_id=${baseId}`, token);
    const inbox = await verify("inbox", "GET", `/inbox/unified?base_id=${baseId}&status=open&limit=5&offset=0`, token);
    await verify("inboxUnread", "GET", `/inbox/unread-count?base_id=${baseId}`, token);
    const first = inbox?.items?.[0]?.id;
    if (first) await verify("conversation", "GET", `/inbox/unified/${encodeURIComponent(first)}?base_id=${baseId}`, token);
    if (first) await verify("inboxContext", "GET", `/inbox/unified/${encodeURIComponent(first)}/context?base_id=${baseId}`, token);
    const contacts = await verify("contacts", "GET", `/leads?base_id=${baseId}&page=1&limit=5&sort_by=last_activity&sort_order=desc`, token);
    const lead = contacts?.leads?.[0]?.id;
    if (lead) {
      await verify("contact", "GET", `/leads/${lead}`, token);
      await verify("timeline", "GET", `/crm/timeline?base_id=${baseId}&lead_id=${lead}&limit=10`, token);
      await verify("contactTasks", "GET", `/crm/tasks?base_id=${baseId}&lead_id=${lead}&status=pending&limit=10`, token);
      await verify("contactDeals", "GET", `/crm/deals?base_id=${baseId}&lead_id=${lead}&status=open&limit=5`, token);
    }
    await verify("tasks", "GET", `/crm/tasks?base_id=${baseId}&status=pending&exclude_type=meeting&limit=20`, token);
    await verify("meetingsSummary", "GET", `/meetings/summary?base_id=${baseId}`, token);
    const upcoming = await verify("meetings", "GET", `/meetings?base_id=${baseId}&view=upcoming&limit=5&offset=0`, token);
    await verify("meetings", "GET", `/meetings?base_id=${baseId}&view=needs_outcome&limit=5&offset=0`, token);
    const from = new Date();
    await verify("meetingRange", "GET", `/meetings/calendar?base_id=${baseId}&from=${from.toISOString()}&to=${new Date(from.getTime() + 14 * 86_400_000).toISOString()}`, token);
    const meetingId = upcoming?.meetings?.[0]?.id;
    if (meetingId) await verify("meeting", "GET", `/meetings/${meetingId}/detail?base_id=${baseId}`, token);
    const inv = await verify("invoices", "GET", `/invoices?base_id=${baseId}&limit=5`, token);
    const invoiceId = inv?.invoices?.[0]?.id;
    if (invoiceId) await verify("invoice", "GET", `/invoices/${invoiceId}?base_id=${baseId}`, token);
    await verify("payments", "GET", `/invoices/payments?base_id=${baseId}`, token);
    await verify("crmBootstrap", "GET", `/crm/bootstrap?base_id=${baseId}`, token);
    await verify("pipelines", "GET", `/crm/pipelines?base_id=${baseId}`, token);
    const board = await verify("board", "GET", `/crm/pipeline?base_id=${baseId}`, token);
    const dealId = Object.values(board?.dealsByStage ?? {}).flat()[0]?.id;
    if (dealId) {
      await verify("deal", "GET", `/crm/deals/${dealId}?base_id=${baseId}`, token);
      await verify("dealTimeline", "GET", `/crm/timeline?base_id=${baseId}&deal_id=${dealId}&limit=10`, token);
      await verify("dealTasks", "GET", `/crm/tasks?base_id=${baseId}&deal_id=${dealId}&status=pending&limit=10`, token);
    }
  } else {
    results.push({ name: "workspace", path: "-", problems: ["account has no workspace; skipped access/home/plan"] });
  }
  await verify("notifications", "GET", "/notifications?limit=5&offset=0", token);
  await verify("unread", "GET", "/notifications/unread-count", token);
  await verify("agencies", "GET", "/agencies/mine", token);
  await verify("notifPrefs", "GET", "/notifications/preferences", token);
} finally {
  await call("POST", "/mobile/auth/logout", token, {}).catch(() => undefined);
}

let failed = 0;
for (const r of results) {
  const ok = r.problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✖"} ${r.name.padEnd(14)} ${r.path}`);
  for (const p of r.problems.slice(0, 8)) console.log(`    ${p}`);
}
console.log(failed ? `\n${failed} endpoint(s) changed shape — update src/types and the screens that read them.` : "\nAll endpoints match what the app expects.");
process.exit(failed ? 1 : 0);
