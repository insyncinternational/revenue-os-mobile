/** Notification rows (backend models/notification.ts; same categories as revenue-os-frontend/lib/notifications.ts). */
export type NotificationCategory =
  | "assignment"
  | "inbox"
  | "meeting"
  | "campaign"
  | "lead"
  | "integration"
  | "billing"
  | "team"
  | "crm"
  | "signal"
  | "ai_sdr"
  | "ai_studio"
  | "account"
  | "system";

export type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  category: NotificationCategory | null;
  metadata: {
    category?: NotificationCategory;
    event?: string;
    action_url?: string;
    base_id?: number;
    conversation_id?: string | number;
    inbox_item_id?: string;
    lead_id?: number;
    deal_id?: number;
    task_id?: number;
    meeting_id?: number;
    pending_action_id?: number;
  } | null;
  base_id: number | null;
  read_at: string | null;
  created_at: string;
};
