/**
 * Every query key in one place. Workspace data always starts with [root, baseId], so switching workspace or client
 * can never show another workspace's data (same convention as the web: ["crm", baseId, …]).
 */
type BaseId = number;

export const keys = {
  me: () => ["me"] as const,
  home: (baseId: BaseId, sinceDays: number) => ["home", baseId, sinceDays] as const,
  inbox: {
    all: (baseId: BaseId) => ["inbox", baseId] as const,
    list: (baseId: BaseId, filters: Record<string, unknown>) => ["inbox", baseId, "list", filters] as const,
    conversation: (baseId: BaseId, itemId: string) => ["inbox", baseId, "conversation", itemId] as const,
    unreadCount: (baseId: BaseId) => ["inbox", baseId, "unread"] as const,
  },
  contacts: {
    all: (baseId: BaseId) => ["contacts", baseId] as const,
    list: (baseId: BaseId, filters: Record<string, unknown>) => ["contacts", baseId, "list", filters] as const,
    recent: (baseId: BaseId) => ["contacts", baseId, "recent"] as const,
    detail: (baseId: BaseId, id: number) => ["contacts", baseId, "detail", id] as const,
    timeline: (baseId: BaseId, id: number) => ["contacts", baseId, "timeline", id] as const,
    tasks: (baseId: BaseId, id: number) => ["contacts", baseId, "tasks", id] as const,
    deals: (baseId: BaseId, id: number) => ["contacts", baseId, "deals", id] as const,
  },
  pipeline: {
    all: (baseId: BaseId) => ["pipeline", baseId] as const,
    bootstrap: (baseId: BaseId) => ["pipeline", baseId, "bootstrap"] as const,
    board: (baseId: BaseId, pipelineId: number | null) => ["pipeline", baseId, "board", pipelineId] as const,
    deal: (baseId: BaseId, id: number) => ["pipeline", baseId, "deal", id] as const,
    pipelines: (baseId: BaseId) => ["pipeline", baseId, "pipelines"] as const,
    dealTimeline: (baseId: BaseId, id: number) => ["pipeline", baseId, "dealTimeline", id] as const,
    dealTasks: (baseId: BaseId, id: number) => ["pipeline", baseId, "dealTasks", id] as const,
  },
  meetings: {
    all: (baseId: BaseId) => ["meetings", baseId] as const,
    list: (baseId: BaseId, view: string) => ["meetings", baseId, "list", view] as const,
    range: (baseId: BaseId, from: string) => ["meetings", baseId, "range", from] as const,
    summary: (baseId: BaseId) => ["meetings", baseId, "summary"] as const,
    detail: (baseId: BaseId, id: number) => ["meetings", baseId, "detail", id] as const,
  },
  tasks: {
    all: (baseId: BaseId) => ["tasks", baseId] as const,
    list: (baseId: BaseId, filter: string) => ["tasks", baseId, "list", filter] as const,
    count: (baseId: BaseId, filter: string) => ["tasks", baseId, "count", filter] as const,
  },
  invoices: {
    all: (baseId: BaseId) => ["invoices", baseId] as const,
    list: (baseId: BaseId, status: string) => ["invoices", baseId, "list", status] as const,
    summary: (baseId: BaseId) => ["invoices", baseId, "summary"] as const,
    detail: (baseId: BaseId, id: number) => ["invoices", baseId, "detail", id] as const,
    payments: (baseId: BaseId) => ["invoices", baseId, "payments"] as const,
  },
  campaigns: {
    all: (baseId: BaseId) => ["campaigns", baseId] as const,
    list: (baseId: BaseId) => ["campaigns", baseId, "list"] as const,
  },
  approvals: {
    all: (baseId: BaseId) => ["approvals", baseId] as const,
    drafts: (baseId: BaseId) => ["approvals", baseId, "drafts"] as const,
    draft: (baseId: BaseId, id: number) => ["approvals", baseId, "draft", id] as const,
    actions: (baseId: BaseId) => ["approvals", baseId, "actions"] as const,
    count: (baseId: BaseId) => ["approvals", baseId, "count"] as const,
  },
  notifications: {
    // Per workspace (null: every workspace, the app-icon badge), like the web's bell.
    list: (baseId: BaseId | null, filter: string) => ["notifications", "feed", baseId ?? "all", filter] as const,
    unreadCount: (baseId: BaseId | null) => ["notifications", "unread", baseId ?? "all"] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
} as const;
