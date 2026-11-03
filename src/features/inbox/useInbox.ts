import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { inboxApi, PAGE_SIZE } from "@/api/inbox";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId } from "@/session/workspace";
import type { InboxConversation, InboxFilter, InboxItem, InboxMessage, InboxPage } from "@/types/inbox";
import { useToast } from "@/ui/Toast";
import type { ReplyAttachment } from "./attachments";
import { mergePages, withMe } from "./list";

export function useInboxList(filter: InboxFilter) {
  const baseId = useActiveBaseId();
  const query = useInfiniteQuery({
    queryKey: keys.inbox.list(baseId ?? 0, filter),
    queryFn: ({ pageParam, signal }) => inboxApi.list(baseId!, filter, pageParam, signal),
    enabled: baseId != null,
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return last.items.length === PAGE_SIZE && loaded < last.total ? loaded : undefined;
    },
    staleTime: 15_000,
    // Live updates arrive over the socket; this is the safety net if it's down.
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const items = useMemo(() => mergePages(query.data?.pages ?? []), [query.data]);
  const head = query.data?.pages[0];
  return { ...query, items, counts: head?.unread_counts, assignment: head?.assignment_counts, total: head?.total ?? 0 };
}

export function useConversation(itemId: string) {
  const baseId = useActiveBaseId();
  return useQuery({
    queryKey: keys.inbox.conversation(baseId ?? 0, itemId),
    queryFn: ({ signal }) => inboxApi.conversation(baseId!, itemId, signal),
    enabled: baseId != null && !!itemId,
    staleTime: 10_000,
    meta: { persist: false },
  });
}

/** Applies a change to one conversation in every cached list page (and its open detail). */
function patchItem(qc: QueryClient, baseId: number, id: string, change: (i: InboxItem) => InboxItem | null) {
  qc.setQueriesData<InfiniteData<InboxPage>>({ queryKey: keys.inbox.all(baseId) }, (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((p) => ({ ...p, items: p.items.flatMap((i) => (i.id === id ? (change(i) ?? []) : [i])) })),
    };
  });
  qc.setQueryData<InboxConversation>(keys.inbox.conversation(baseId, id), (c) => {
    if (!c) return c;
    const next = change(c.item);
    return next ? { ...c, item: next } : c;
  });
}

type Action = "read" | "unread" | "archive" | "unarchive" | "assignMe" | "snoozeTomorrow";

/** Read / unread / archive / assign / snooze: the list changes at once, rolls back if the server refuses. */
export function useInboxAction() {
  const baseId = useActiveBaseId();
  const me = useSession((s) => s.user?.id);
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    /** `assignees`: who is assigned now ("Assign to me" adds you to them; the server's list replaces the old one). */
    mutationFn: async ({ id, action, assignees = [] }: { id: string; action: Action; assignees?: number[] }) => {
      const b = baseId!;
      switch (action) {
        case "read":
          return inboxApi.markRead(b, id);
        case "unread":
          return inboxApi.markUnread(b, id);
        case "archive":
          return inboxApi.archive(b, id);
        case "unarchive":
          return inboxApi.unarchive(b, id);
        case "assignMe":
          return inboxApi.assign(b, id, withMe(assignees, me));
        case "snoozeTomorrow": {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(9, 0, 0, 0);
          return inboxApi.snooze(b, id, d.toISOString());
        }
      }
    },
    onMutate: async ({ id, action, assignees = [] }) => {
      if (baseId == null) return;
      await qc.cancelQueries({ queryKey: keys.inbox.all(baseId) });
      const snapshot = qc.getQueriesData({ queryKey: keys.inbox.all(baseId) });
      patchItem(qc, baseId, id, (i) => {
        switch (action) {
          case "read":
            return { ...i, unread_count: 0 };
          case "unread":
            return { ...i, unread_count: Math.max(1, i.unread_count) };
          case "archive":
          case "snoozeTomorrow":
            return null;
          case "assignMe":
            return me ? { ...i, assignee_user_id: me, assignee_user_ids: withMe(assignees, me) } : i;
          default:
            return i;
        }
      });
      return { snapshot };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: () => {
      if (baseId != null) {
        void qc.invalidateQueries({ queryKey: keys.inbox.all(baseId) });
        void qc.invalidateQueries({ queryKey: keys.inbox.unreadCount(baseId) });
      }
    },
  });
}

/** A reply on its way: shown at once, with the names of any files it carries (the server's copy has none). */
export type PendingMessage = InboxMessage & { pending?: boolean; failed?: boolean; attachment_names?: string[] };

/**
 * Sends a reply. The message appears in the thread at once (marked as sending), then the conversation is
 * re-read from the server (the reply endpoint returns no message). A failure leaves it marked so it can be retried.
 */
export function useSendReply(itemId: string) {
  const baseId = useActiveBaseId();
  const qc = useQueryClient();
  const key = keys.inbox.conversation(baseId ?? 0, itemId);

  return useMutation({
    mutationFn: (input: { text: string; tempId: string; whatsapp?: { integration_id: number | null; account_id: string | null } | null; attachments?: ReplyAttachment[] }) =>
      inboxApi.reply(baseId!, itemId, {
        body_text: input.text,
        ...(input.whatsapp ? { whatsapp_integration_id: input.whatsapp.integration_id, whatsapp_account_id: input.whatsapp.account_id } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments.map(({ filename, content_base64, content_type }) => ({ filename, content_base64, content_type })) } : {}),
      }),
    onMutate: async ({ text, tempId, attachments }) => {
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<InboxConversation>(key, (c) =>
        c
          ? {
              ...c,
              messages: [
                ...c.messages.filter((m) => m.id !== tempId),
                {
                  id: tempId,
                  direction: "outbound",
                  body_text: text,
                  body_html: null,
                  from_label: t("inbox.you"),
                  created_at: new Date().toISOString(),
                  message_kind: "message",
                  pending: true,
                  attachment_names: attachments?.map((a) => a.filename),
                } as PendingMessage,
              ],
            }
          : c
      );
    },
    onSuccess: () => {
      haptics.success();
    },
    onError: (_e, { tempId }) => {
      haptics.warning();
      qc.setQueryData<InboxConversation>(key, (c) => (c ? { ...c, messages: c.messages.map((m) => (m.id === tempId ? ({ ...m, pending: false, failed: true } as PendingMessage) : m)) } : c));
    },
    onSettled: (_d, error) => {
      if (!error) void qc.invalidateQueries({ queryKey: key });
      if (baseId != null) void qc.invalidateQueries({ queryKey: keys.inbox.all(baseId), refetchType: "none" });
    },
  });
}

export function useInboxUnreadCount() {
  const baseId = useActiveBaseId();
  return useQuery({
    queryKey: keys.inbox.unreadCount(baseId ?? 0),
    queryFn: ({ signal }) => inboxApi.unreadCount(baseId!, signal),
    enabled: baseId != null,
    staleTime: 20_000,
  }).data?.count;
}
