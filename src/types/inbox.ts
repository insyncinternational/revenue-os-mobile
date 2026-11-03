/**
 * Unified inbox (backend routes/inbox.ts, services/emailInfra/unifiedInbox.service.ts). Item ids are strings
 * like "email:145" or "website-chat:25" and must be URL-encoded in paths.
 */
import type { Channel } from "@/ui/ChannelIcon";

export type InboxChannel = Exclude<Channel, "call">;

export type WhatsAppAccountOption = { integration_id: number | null; account_id: string | null; label: string; source?: string };

export type InboxItem = {
  id: string;
  source: string;
  channel: InboxChannel;
  thread_id: number | null;
  lead_id: number | null;
  campaign_name: string | null;
  contact_label: string;
  contact_email: string | null;
  contact_phone: string | null;
  subject: string | null;
  preview: string | null;
  mailbox_email: string | null;
  last_message_at: string | null;
  unread_count: number;
  can_reply: boolean;
  last_inbound_at: string | null;
  assignee_user_id: number | null;
  assignee_user_ids: number[];
  snoozed_until: string | null;
  /** Emails a campaign sent (tracked activity, no mailbox thread): readable, never replied to here. */
  timeline_only?: boolean;
  whatsapp_account_options?: WhatsAppAccountOption[];
  /** The number this conversation sends from (campaign / last send); `locked` when it can't change. */
  whatsapp_from?: { integration_id: number; account_id: string; label: string; locked: boolean } | null;
};

export type InboxCounts = Record<"all" | InboxChannel, number>;

export type InboxPage = {
  items: InboxItem[];
  total: number;
  unread_counts: InboxCounts;
  assignment_counts: { mine: number; unassigned: number };
};

export type InboxMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body_text: string | null;
  body_html: string | null;
  from_label: string | null;
  created_at: string;
  message_kind: "message" | "activity";
  activity_label?: string | null;
  subject?: string | null;
  placeholder?: boolean;
};

export type InboxConversation = { item: InboxItem; messages: InboxMessage[]; base_id: number };

export type InboxFilter = { view: "all" | "unread" | "mine" | "unassigned"; channel: "all" | InboxChannel; status: "open" | "archived"; search: string };

/** GET /inbox/unified/:id/context — who's behind a conversation. */
export type ConversationContext = {
  lead: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    role: string | null;
    region: string | null;
    industry: string | null;
    score: number | null;
    tier: string | null;
    linkedin_url: string | null;
  } | null;
  owner: { id: number; name: string } | null;
  /** Open deals; amount is a SQL DECIMAL (string). */
  deals: { id: number; name: string; amount: string | number | null; currency: string | null; stage: string | null; expected_close_date: string | null }[];
  channels: { channel: string; last_contacted_at: string }[];
};

/** POST /inbox/copilot/rewrite modes; "tone:<x>" picks a tone. */
export type RewriteMode = "shorter" | "qualification_question" | "tone:friendly" | "tone:formal" | "tone:direct" | "tone:warm";
