import { router } from "expo-router";
import { appLinkFor, conversationIdIn, meetingIdIn, type AppLink } from "./links";

/** Opens an app screen by its public path ("/inbox"). One place for in-app navigation from mapped links. */
export function go(link: AppLink): void {
  router.push(link);
}

/** Opens one contact. */
export function openContact(id: number): void {
  router.push({ pathname: "/contact/[id]", params: { id: String(id) } });
}

/** New contact, or edit one (sheet). */
export function openContactForm(id?: number): void {
  router.push(id ? { pathname: "/contact-form", params: { id: String(id) } } : "/contact-form");
}

export function openDeal(id: number): void {
  router.push({ pathname: "/deal/[id]", params: { id: String(id) } });
}

/** New deal (optionally in a stage / for a contact) or edit one. */
export function openDealForm(opts: { id?: number; stageId?: number; leadId?: number } = {}): void {
  const params: Record<string, string> = {};
  if (opts.id) params.id = String(opts.id);
  if (opts.stageId) params.stageId = String(opts.stageId);
  if (opts.leadId) params.leadId = String(opts.leadId);
  router.push({ pathname: "/deal-form", params });
}

/** Which pipeline the board shows (a sheet: holds any number of pipelines). */
export function openPipelinePicker(): void {
  router.push("/pipeline-picker");
}

/** The stage picker for a deal (move, won, lost with reason); `lost` opens straight on "Why was it lost?". */
export function openMoveDeal(id: number, opts: { lost?: boolean } = {}): void {
  router.push({ pathname: "/move-deal", params: opts.lost ? { id: String(id), lost: "1" } : { id: String(id) } });
}

/** Opens one conversation (inbox item id such as "email:145"). */
/** `reply`: open with the reply box focused (the inbox row's Reply button). */
export function openConversation(itemId: string, opts?: { reply?: boolean }): void {
  router.push({ pathname: "/conversation/[itemId]", params: opts?.reply ? { itemId, reply: "1" } : { itemId } });
}

export function openCalendar(): void {
  router.push("/calendar");
}

export function openTasks(): void {
  router.push("/tasks");
}

export function openInvoices(): void {
  router.push("/invoices");
}

export function openInvoice(id: number): void {
  router.push({ pathname: "/invoice/[id]", params: { id: String(id) } });
}

/** The quick new-invoice form (sheet), optionally for a contact. */
export function openInvoiceForm(opts: { leadId?: number } = {}): void {
  router.push(opts.leadId ? { pathname: "/invoice-form", params: { leadId: String(opts.leadId) } } : "/invoice-form");
}

export function openCampaigns(): void {
  router.push("/campaigns");
}

export function openApprovals(): void {
  router.push("/approvals");
}

/** One AI draft to read, edit and approve. */
export function openApproval(id: number): void {
  router.push({ pathname: "/approval/[id]", params: { id: String(id) } });
}

export function openMeeting(id: number): void {
  router.push({ pathname: "/meeting/[id]", params: { id: String(id) } });
}

/** New meeting (optionally with a contact), or move one (`rescheduleId`). */
export function openMeetingForm(opts: { leadId?: number; rescheduleId?: number } = {}): void {
  const params: Record<string, string> = {};
  if (opts.leadId) params.leadId = String(opts.leadId);
  if (opts.rescheduleId) params.id = String(opts.rescheduleId);
  router.push({ pathname: "/meeting-form", params });
}

/** "How did it go?" for a meeting, opened on Attended or No-show. */
export function openMeetingOutcome(id: number, outcome: "attended" | "no_show"): void {
  router.push({ pathname: "/meeting-outcome", params: { id: String(id), outcome } });
}

/** New task (optionally for a contact or deal), or edit one. */
export function openTaskForm(opts: { id?: number; leadId?: number; dealId?: number } = {}): void {
  const params: Record<string, string> = {};
  if (opts.id) params.id = String(opts.id);
  if (opts.leadId) params.leadId = String(opts.leadId);
  if (opts.dealId) params.dealId = String(opts.dealId);
  router.push({ pathname: "/task-form", params });
}

/** Opens what a web link points at: the exact conversation or meeting when it names one, else the matching screen. */
export function openWebHref(href: string | null | undefined): void {
  const conversation = conversationIdIn(href);
  if (conversation) return openConversation(conversation);
  const meeting = meetingIdIn(href);
  if (meeting) return openMeeting(meeting);
  const link = appLinkFor(href);
  if (link) go(link);
}
