import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { keys } from "@/query/keys";
import type { NotificationRow } from "@/types/notifications";
import { useToast } from "@/ui/Toast";
import { haptics } from "@/lib/haptics";
import { useActiveBaseId } from "@/session/workspace";

export type NotifFilter = "all" | "unread" | "inbox" | "assignment" | "meeting" | "crm";

const PAGE = 30;
type Page = { notifications: NotificationRow[]; unread_count: number; has_more: boolean };

export function useNotificationFeed(filter: NotifFilter) {
  const baseId = useActiveBaseId();
  return useInfiniteQuery({
    queryKey: keys.notifications.list(baseId, filter),
    queryFn: ({ pageParam, signal }) =>
      notificationsApi.list(
        { baseId, offset: pageParam, limit: PAGE, unread_only: filter === "unread", category: filter === "all" || filter === "unread" ? undefined : filter },
        signal
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.reduce((n, p) => n + p.notifications.length, 0) : undefined),
    staleTime: 30_000,
  });
}

/** Marks rows read in every cached feed at once, and lowers the unread badge — the server catches up behind. */
function markLocally(qc: ReturnType<typeof useQueryClient>, ids: number[] | "all") {
  const now = new Date().toISOString();
  let changed = 0;
  qc.setQueriesData<InfiniteData<Page>>({ queryKey: ["notifications", "feed"] }, (data) => {
    if (!data?.pages) return data;
    let changedHere = 0;
    const pages = data.pages.map((p) => ({
      ...p,
      notifications: p.notifications.map((n) => {
        if (n.read_at || (ids !== "all" && !ids.includes(n.id))) return n;
        changedHere++;
        return { ...n, read_at: now };
      }),
    }));
    changed = Math.max(changed, changedHere);
    // Each page carries the account's unread total; keep it in step (the "Unread" chip and mark-all read it).
    const unread = (n: number) => (ids === "all" ? 0 : Math.max(0, n - Math.max(changedHere, ids.length)));
    return { ...data, pages: pages.map((p) => ({ ...p, unread_count: unread(p.unread_count) })) };
  });
  // Every cached count (this workspace's bell, the account-wide app badge) drops with it.
  qc.setQueriesData<{ unread_count: number }>({ queryKey: ["notifications", "unread"] }, (c) =>
    c ? { unread_count: ids === "all" ? 0 : Math.max(0, c.unread_count - Math.max(1, changed)) } : c
  );
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onMutate: (id) => markLocally(qc, [id]),
    onError: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const toast = useToast();
  const baseId = useActiveBaseId();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(baseId),
    onMutate: () => markLocally(qc, "all"),
    onSuccess: () => {
      // "All" meant this workspace's; the account-wide badge recounts.
      void qc.invalidateQueries({ queryKey: keys.notifications.unreadCount(null) });
      haptics.success();
      toast.show(t("notif.allRead"), { kind: "success" });
    },
    onError: (e) => {
      toast.show(userMessage(e), { kind: "error" });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
