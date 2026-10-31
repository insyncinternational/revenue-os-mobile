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
    detail: (baseId: BaseId, id: number) => ["contacts", baseId, "detail", id] as const,
  },
  pipeline: {
    all: (baseId: BaseId) => ["pipeline", baseId] as const,
    bootstrap: (baseId: BaseId) => ["pipeline", baseId, "bootstrap"] as const,
    board: (baseId: BaseId, pipelineId: number | null) => ["pipeline", baseId, "board", pipelineId] as const,
    deal: (baseId: BaseId, id: number) => ["pipeline", baseId, "deal", id] as const,
  },
  notifications: {
    list: (filter: string) => ["notifications", filter] as const,
    unreadCount: () => ["notifications", "unread"] as const,
  },
} as const;
