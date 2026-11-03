import type { TranslationKey } from "@/i18n";
import type { TimelineItem } from "@/types/contact";

/** Campaign events arrive with only their type ("sent") as the subject: each gets a proper sentence. */
export const CAMPAIGN_LABEL: Record<string, TranslationKey> = {
  sent: "timeline.campaignSent",
  opened: "timeline.campaignOpened",
  clicked: "timeline.campaignClicked",
  replied: "timeline.campaignReplied",
  bounced: "timeline.campaignBounced",
};

const TYPE_LABEL: Record<string, TranslationKey> = {
  note: "timeline.note",
  call: "timeline.call",
  voice_call: "timeline.call",
  ai_voice_call: "timeline.aiCall",
  email: "timeline.email",
  meeting: "timeline.meeting",
  whatsapp_message: "timeline.whatsapp",
  linkedin_message: "timeline.linkedin",
};

/**
 * Pure: what a timeline event is called — a translation key, or text to show as is. The event's own subject wins,
 * except a campaign event's, which only repeats its type.
 */
export function eventTitle(it: Pick<TimelineItem, "source" | "type" | "subject">): { key: TranslationKey } | { text: string } {
  const campaign = it.source === "campaign" ? CAMPAIGN_LABEL[it.type] : undefined;
  if (campaign) return { key: campaign };
  const subject = it.subject?.trim() && !(it.source === "campaign" && it.subject === it.type) ? it.subject.trim() : null;
  if (subject) return { text: subject };
  const known = TYPE_LABEL[it.type];
  if (known) return { key: known };
  // "whatsapp_message" → "Whatsapp message".
  const words = it.type.replace(/_/g, " ").trim();
  return { text: words ? words.charAt(0).toUpperCase() + words.slice(1) : "" };
}
