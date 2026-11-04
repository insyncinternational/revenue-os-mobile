import { contactPatch } from "@/features/contacts/contact";
import type { CallOutcome, Contact, ContactInput, ContactPage, CrmTask, DealSummary, TimelineItem } from "@/types/contact";
import { api } from "./client";
import { numericAmount } from "./pipeline";

export const CONTACTS_PAGE = 30;

export type ContactFilter = { view: "all" | "mine" | "phone"; search: string };

export const contactsApi = {
  list: (baseId: number, f: ContactFilter, page: number, me: number | null, signal?: AbortSignal) =>
    api.get<ContactPage>(
      "/leads",
      {
        base_id: baseId,
        page,
        limit: CONTACTS_PAGE,
        search: f.search.trim() || undefined,
        owner_id: f.view === "mine" && me ? me : undefined,
        has_phone: f.view === "phone" ? "true" : undefined,
        // A–Z, so the list files under letters; the recently active ones have their own row (`recent`).
        sort_by: "name",
        sort_order: "asc",
        // Light rows: enrichment trimmed to what a list shows (~25 KB less per contact, and this list is
        // kept on the phone for offline use). The contact screen loads the full record (GET /leads/:id).
        view: "table",
      },
      signal
    ),
  /** The few contacts touched most recently, for the "Recently active" row above the A–Z list. */
  recent: (baseId: number, signal?: AbortSignal) =>
    api.get<ContactPage>("/leads", { base_id: baseId, page: 1, limit: 8, sort_by: "last_activity", sort_order: "desc", view: "table" }, signal),
  get: (id: number, signal?: AbortSignal) => api.get<Contact>(`/leads/${id}`, undefined, signal),
  /** Free (no enrichment, no credits). base_id must be a JSON number. */
  create: (baseId: number, input: ContactInput) => api.post<{ lead: Contact }>("/leads", { base_id: baseId, ...contactPatch(input, "create") }),
  /** Whitelisted fields only — see contactPatch. */
  update: (id: number, input: Partial<ContactInput>) => api.put<{ lead: Contact }>(`/leads/${id}`, contactPatch(input, "update")),
  timeline: (baseId: number, leadId: number, signal?: AbortSignal) => api.get<{ timeline: TimelineItem[] }>("/crm/timeline", { base_id: baseId, lead_id: leadId, limit: 50 }, signal),
  tasks: (baseId: number, leadId: number, signal?: AbortSignal) =>
    api.get<{ tasks: CrmTask[] }>("/crm/tasks", { base_id: baseId, lead_id: leadId, status: "pending", limit: 50 }, signal),
  deals: (baseId: number, leadId: number, signal?: AbortSignal) => api
      .get<{ deals: DealSummary[] }>("/crm/deals", { base_id: baseId, lead_id: leadId, status: "open", limit: 10 }, signal)
      .then((r) => ({ ...r, deals: r.deals.map(numericAmount) })),
  addNote: (baseId: number, leadId: number, body: string) => api.post<unknown>("/crm/activities", { base_id: baseId, type: "note", body, lead_id: leadId }),
  /**
   * A call made from the phone's own dialler, logged as a CRM call activity: free and always available.
   * (Call "sessions" run an AI analysis with the workspace's own key and fail when none is set.)
   */
  logCall: (baseId: number, leadId: number, outcome: CallOutcome, outcomeLabel: string, notes: string) =>
    api.post<unknown>("/crm/activities", { base_id: baseId, type: "call", subject: outcomeLabel, body: notes || undefined, lead_id: leadId, metadata: { outcome, source: "mobile_dialer" } }),
};
