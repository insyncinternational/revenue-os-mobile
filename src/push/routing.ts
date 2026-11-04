import { appLinkFor, meetingIdIn, type AppLink } from "@/lib/links";

/** The routing ids the backend puts in a push (revenue-os-backend services/mobile/mobilePush.service.ts). */
export type PushData = {
  notification_id?: number;
  category?: string;
  base_id?: number;
  action_url?: string;
  conversation_id?: string | number;
  inbox_item_id?: string;
  lead_id?: number;
  deal_id?: number;
  task_id?: number;
  meeting_id?: number;
  /** An AI SDR draft waiting for approval. */
  pending_action_id?: number;
  /** Agency alerts. */
  agency_id?: number;
  client_id?: number;
};

/** Pure: an inbox item id ("email:145") from a push or notification, if it names one. */
export function conversationIdOf(data: Pick<PushData, "inbox_item_id" | "conversation_id"> | null | undefined): string | null {
  const id = data?.inbox_item_id ?? (typeof data?.conversation_id === "string" ? data.conversation_id : null);
  return id && /^[a-z-]+:/.test(id) ? id : null;
}

/** Pure: the meeting a push or notification is about, if it names one. */
export function meetingIdOf(data: Pick<PushData, "meeting_id" | "action_url"> | null | undefined): number | null {
  const id = Number(data?.meeting_id);
  return Number.isInteger(id) && id > 0 ? id : meetingIdIn(data?.action_url);
}

/** Pure: the AI draft a push or notification asks to approve, if it names one. */
export function approvalIdOf(data: Pick<PushData, "pending_action_id"> | null | undefined): number | null {
  const id = Number(data?.pending_action_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type PushRoute = {
  baseId: number | null;
  conversation: string | null;
  meeting: number | null;
  approval: number | null;
  /** The record itself, when the push is about one deal, task or contact (opened instead of their list). */
  deal: number | null;
  task: number | null;
  contact: number | null;
  link: AppLink;
};

const idOf = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Pure: where a tapped notification opens — the exact conversation, meeting or AI draft, else the matching screen, else
 * the notifications list (never nowhere).
 */
export function routeForPush(data: PushData | null | undefined): PushRoute {
  const baseId = typeof data?.base_id === "number" && data.base_id > 0 ? data.base_id : null;
  const conversation = conversationIdOf(data);
  const meeting = conversation ? null : meetingIdOf(data);
  // A hand-off names its draft too, but the person replies in the conversation — that wins.
  const approval = conversation || meeting ? null : approvalIdOf(data);
  const fromUrl = appLinkFor(data?.action_url);
  // One record, most specific first: a deal (its contact is on it), else a task, else the contact.
  const general = conversation || meeting || approval;
  const deal = general ? null : idOf(data?.deal_id);
  const task = general || deal ? null : idOf(data?.task_id);
  const contact = general || deal || task ? null : idOf(data?.lead_id);
  const at = (link: AppLink): PushRoute => ({ baseId, conversation, meeting, approval, deal, task, contact, link });
  if (conversation) return at("/inbox");
  if (meeting) return at("/calendar");
  if (approval) return at("/approvals");
  if (fromUrl) return at(fromUrl);
  if (data?.category === "inbox") return at("/inbox");
  if (data?.task_id) return at("/tasks");
  if (data?.deal_id) return at("/pipeline");
  if (data?.lead_id) return at("/contacts");
  return at("/notifications");
}
