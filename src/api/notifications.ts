import type { NotificationRow } from "@/types/notifications";
import { api } from "./client";

export const notificationsApi = {
  /**
   * `baseId`: the active workspace, as on the web: its notifications plus account-wide ones, and its
   * hidden modules left out. Null: every workspace (the app-icon badge).
   */
  list: (params: { baseId: number | null; offset: number; limit: number; unread_only?: boolean; category?: string }, signal?: AbortSignal) =>
    api.get<{ notifications: NotificationRow[]; unread_count: number; has_more: boolean }>(
      "/notifications",
      {
        offset: params.offset,
        limit: params.limit,
        unread_only: params.unread_only ? "true" : undefined,
        category: params.category,
        base_id: params.baseId ?? undefined,
      },
      signal
    ),
  unreadCount: (baseId: number | null, signal?: AbortSignal) =>
    api.get<{ unread_count: number }>("/notifications/unread-count", baseId ? { base_id: baseId } : undefined, signal),
  markRead: (id: number) => api.patch<unknown>(`/notifications/${id}/read`),
  markAllRead: (baseId: number | null) => api.patch<unknown>(baseId ? `/notifications/read-all?base_id=${baseId}` : "/notifications/read-all"),
  /** Per-category email / push switches (push covers this phone and the web browser alike). */
  preferences: (signal?: AbortSignal) => api.get<{ categories: NotificationPreference[] }>("/notifications/preferences", undefined, signal),
  setPreference: (id: string, change: { push?: boolean; email?: boolean }) =>
    api.patch<{ categories: Pick<NotificationPreference, "id" | "email" | "push">[] }>("/notifications/preferences", { categories: { [id]: change } }),
};

export type NotificationPreference = { id: string; label: string; description: string; email: boolean; push: boolean };
