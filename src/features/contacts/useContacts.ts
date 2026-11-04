import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contactsApi, type ContactFilter } from "@/api/contacts";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId } from "@/session/workspace";
import type { CallOutcome, Contact, ContactInput } from "@/types/contact";
import { useToast } from "@/ui/Toast";

export function useContactList(filter: ContactFilter) {
  const baseId = useActiveBaseId();
  const me = useSession((s) => s.user?.id ?? null);
  const query = useInfiniteQuery({
    queryKey: keys.contacts.list(baseId ?? 0, filter),
    queryFn: ({ pageParam, signal }) => contactsApi.list(baseId!, filter, pageParam, me, signal),
    enabled: baseId != null,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const items = useMemo(() => {
    const seen = new Set<number>();
    return (query.data?.pages ?? []).flatMap((p) => p.leads).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, [query.data]);
  return { ...query, items, total: query.data?.pages[0]?.pagination.total ?? 0 };
}

/** Up to six contacts with the most recent activity (none without any), for the "Recently active" row. */
export function useRecentContacts(enabled: boolean) {
  const baseId = useActiveBaseId();
  return useQuery({
    queryKey: keys.contacts.recent(baseId ?? 0),
    queryFn: ({ signal }) => contactsApi.recent(baseId!, signal),
    enabled: enabled && baseId != null,
    staleTime: 60_000,
    select: (page) => page.leads.filter((c) => c.last_activity_at).slice(0, 6),
  });
}

/** One contact and everything around it; each part loads on its own so the screen fills in progressively. */
export function useContact(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const enabled = baseId > 0 && id > 0;
  const contact = useQuery({ queryKey: keys.contacts.detail(baseId, id), queryFn: ({ signal }) => contactsApi.get(id, signal), enabled, staleTime: 30_000 });
  const timeline = useQuery({ queryKey: keys.contacts.timeline(baseId, id), queryFn: ({ signal }) => contactsApi.timeline(baseId, id, signal), enabled, staleTime: 30_000, meta: { persist: false } });
  const tasks = useQuery({ queryKey: keys.contacts.tasks(baseId, id), queryFn: ({ signal }) => contactsApi.tasks(baseId, id, signal), enabled, staleTime: 30_000, meta: { persist: false } });
  const deals = useQuery({ queryKey: keys.contacts.deals(baseId, id), queryFn: ({ signal }) => contactsApi.deals(baseId, id, signal), enabled, staleTime: 60_000, meta: { persist: false } });
  return { contact, timeline, tasks, deals };
}

export function useSaveContact(id: number | null) {
  const baseId = useActiveBaseId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInput): Promise<Contact> => (id ? (await contactsApi.update(id, input)).lead : (await contactsApi.create(baseId!, input)).lead),
    onSuccess: (saved) => {
      haptics.success();
      if (baseId != null) {
        qc.setQueryData(keys.contacts.detail(baseId, saved.id), (prev: Contact | undefined) => ({ ...prev, ...saved }));
        void qc.invalidateQueries({ queryKey: keys.contacts.all(baseId) });
      }
    },
  });
}

export function useAddNote(leadId: number) {
  const baseId = useActiveBaseId();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: string) => contactsApi.addNote(baseId!, leadId, body),
    onSuccess: () => {
      haptics.success();
      toast.show(t("contacts.noteSaved"), { kind: "success" });
      if (baseId != null) void qc.invalidateQueries({ queryKey: keys.contacts.timeline(baseId, leadId) });
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
}

export function useLogCall(leadId: number) {
  const baseId = useActiveBaseId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { outcome: CallOutcome; label: string; notes: string }) => contactsApi.logCall(baseId!, leadId, v.outcome, v.label, v.notes),
    onSuccess: () => {
      haptics.success();
      if (baseId != null) {
        void qc.invalidateQueries({ queryKey: keys.contacts.timeline(baseId, leadId) });
        void qc.invalidateQueries({ queryKey: keys.contacts.all(baseId), refetchType: "none" });
        void qc.invalidateQueries({ queryKey: ["home", baseId] });
      }
    },
  });
}
