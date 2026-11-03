import type { ConversationContext, InboxConversation, InboxFilter, InboxPage, RewriteMode } from "@/types/inbox";
import { api } from "./client";

const item = (id: string) => `/inbox/unified/${encodeURIComponent(id)}`;

export const PAGE_SIZE = 30;

export const inboxApi = {
  list: (baseId: number, f: InboxFilter, offset: number, signal?: AbortSignal) =>
    api.get<InboxPage>(
      "/inbox/unified",
      {
        base_id: baseId,
        status: f.status,
        channel: f.channel === "all" ? undefined : f.channel,
        unread: f.view === "unread" ? 1 : undefined,
        assignee: f.view === "mine" ? "me" : f.view === "unassigned" ? "unassigned" : undefined,
        search: f.search.trim() || undefined,
        limit: PAGE_SIZE,
        offset,
      },
      signal
    ),
  conversation: (baseId: number, id: string, signal?: AbortSignal) => api.get<InboxConversation>(item(id), { base_id: baseId }, signal),
  markRead: (baseId: number, id: string) => api.post<{ ok: true }>(`${item(id)}/read`, {}, { base_id: baseId }),
  markUnread: (baseId: number, id: string) => api.post<{ ok: true }>(`${item(id)}/unread`, {}, { base_id: baseId }),
  archive: (baseId: number, id: string) => api.post<{ ok: true }>(`${item(id)}/archive`, {}, { base_id: baseId }),
  unarchive: (baseId: number, id: string) => api.post<{ ok: true }>(`${item(id)}/unarchive`, {}, { base_id: baseId }),
  assign: (baseId: number, id: string, userIds: number[]) => api.post<{ ok: true }>(`${item(id)}/assign`, { assignee_user_ids: userIds }, { base_id: baseId }),
  snooze: (baseId: number, id: string, until: string | null) => api.post<{ ok: true }>(`${item(id)}/snooze`, { until }, { base_id: baseId }),
  /** Attachments go out on email replies only (other channels send text). */
  reply: (
    baseId: number,
    id: string,
    body: { body_text: string; whatsapp_integration_id?: number | null; whatsapp_account_id?: string | null; attachments?: { filename: string; content_base64: string; content_type?: string }[] }
  ) =>
    api.post<{ ok: true }>(`${item(id)}/reply`, body, { base_id: baseId }),
  whatsappTemplates: (baseId: number, id: string) => api.get<{ templates: { name: string; language?: string; body?: string }[] }>(`${item(id)}/whatsapp-templates`, { base_id: baseId }),
  sendWhatsappTemplate: (baseId: number, id: string, template_name: string, language?: string) =>
    api.post<{ ok: true }>(`${item(id)}/whatsapp-template`, { template_name, language }, { base_id: baseId }),
  /** The contact behind a conversation: details, owner, open deals, last contact per channel. */
  context: (baseId: number, id: string, signal?: AbortSignal) => api.get<ConversationContext>(`${item(id)}/context`, { base_id: baseId }, signal),
  /** Reshapes a draft with the workspace's AI (never adds facts). */
  rewrite: (baseId: number, text: string, mode: RewriteMode) =>
    api.post<{ text: string }>("/inbox/copilot/rewrite", { base_id: baseId, text, mode: mode.startsWith("tone:") ? "tone" : mode, tone: mode.startsWith("tone:") ? mode.slice(5) : undefined }),
  unreadCount: (baseId: number, signal?: AbortSignal) => api.get<{ count: number }>("/inbox/unread-count", { base_id: baseId }, signal),
};
