import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { MEETINGS_PAGE, meetingsApi } from "@/api/meetings";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { addDays, endOfDayIso, startOfDay } from "@/lib/when";
import { keys } from "@/query/keys";
import { useActiveBaseId } from "@/session/workspace";
import type { Meeting, MeetingPage, MeetingView, OutcomeInput } from "@/types/calendar";
import { useToast } from "@/ui/Toast";

export function useMeetingList(view: MeetingView, enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  const query = useInfiniteQuery({
    queryKey: keys.meetings.list(baseId, view),
    queryFn: ({ pageParam, signal }) => meetingsApi.list(baseId, view, pageParam, signal),
    enabled: enabled && baseId > 0,
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length * MEETINGS_PAGE : undefined),
    staleTime: 30_000,
  });
  const meetings = useMemo(() => {
    const seen = new Set<number>();
    return (query.data?.pages ?? []).flatMap((p) => p.meetings).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [query.data]);
  return { ...query, meetings };
}

/** The day strip's two weeks, from today. */
export const STRIP_DAYS = 14;

export function useMeetingStrip(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  // Fixed for this visit (render stays pure); the screen remounts on the next visit.
  const [from] = useState(() => startOfDay(new Date()));
  return useQuery({
    queryKey: keys.meetings.range(baseId, from.toISOString()),
    queryFn: ({ signal }) => meetingsApi.range(baseId, from.toISOString(), addDays(from, STRIP_DAYS).toISOString(), signal),
    enabled: enabled && baseId > 0,
    staleTime: 60_000,
  });
}

export function useMeetingsSummary(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.meetings.summary(baseId),
    queryFn: ({ signal }) => meetingsApi.summary(baseId, endOfDayIso(new Date()), signal),
    enabled: enabled && baseId > 0,
    staleTime: 60_000,
  });
}

/** A meeting already in a cached list, so its screen opens filled in. */
function cachedMeeting(qc: QueryClient, baseId: number, id: number): Meeting | undefined {
  for (const [, data] of qc.getQueriesData<InfiniteData<MeetingPage>>({ queryKey: ["meetings", baseId, "list"] })) {
    const hit = data?.pages.flatMap((p) => p.meetings).find((m) => m.id === id);
    if (hit) return hit;
  }
  for (const [, data] of qc.getQueriesData<{ meetings: Meeting[] }>({ queryKey: ["meetings", baseId, "range"] })) {
    const hit = data?.meetings.find((m) => m.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useMeeting(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useQuery<{ meeting: Meeting }>({
    queryKey: keys.meetings.detail(baseId, id),
    queryFn: ({ signal }) => meetingsApi.get(baseId, id, signal),
    enabled: baseId > 0 && id > 0,
    staleTime: 30_000,
    placeholderData: (prev) => {
      if (prev?.meeting.id === id) return prev;
      const m = cachedMeeting(qc, baseId, id);
      return m ? { meeting: m } : undefined;
    },
  });
}

/** After any change: the meeting, every list and count, Today, and the contact's timeline and tasks. */
function refreshAfter(qc: QueryClient, baseId: number, meeting: Meeting) {
  qc.setQueryData(keys.meetings.detail(baseId, meeting.id), { meeting });
  void qc.invalidateQueries({ queryKey: keys.meetings.all(baseId), predicate: (q) => q.queryKey[2] !== "detail" });
  void qc.invalidateQueries({ queryKey: ["home", baseId] });
  void qc.invalidateQueries({ queryKey: keys.tasks.all(baseId) });
  if (meeting.lead_id) {
    void qc.invalidateQueries({ queryKey: keys.contacts.timeline(baseId, meeting.lead_id) });
    void qc.invalidateQueries({ queryKey: keys.contacts.tasks(baseId, meeting.lead_id) });
  }
}

type Action = { kind: "outcome"; input: OutcomeInput } | { kind: "reschedule"; dueAt: string } | { kind: "cancel" } | { kind: "reopen" };

/** Outcome (with Undo), reschedule, cancel, reopen — one hook so every screen reports them the same way. */
export function useMeetingAction(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  const reopen = useMutation({
    mutationFn: () => meetingsApi.reopen(baseId, id),
    onSuccess: ({ meeting }) => {
      haptics.light();
      refreshAfter(qc, baseId, meeting);
    },
  });
  return useMutation({
    mutationFn: (a: Action) =>
      a.kind === "outcome"
        ? meetingsApi.outcome(baseId, id, a.input)
        : a.kind === "reschedule"
          ? meetingsApi.reschedule(baseId, id, a.dueAt)
          : a.kind === "cancel"
            ? meetingsApi.cancel(baseId, id)
            : meetingsApi.reopen(baseId, id),
    onSuccess: ({ meeting }, a) => {
      haptics.success();
      refreshAfter(qc, baseId, meeting);
      if (a.kind === "outcome") {
        // The server adds a follow-up task (contact meetings only); Undo can't take that back, so it's offered only without one.
        const followUp = Boolean(meeting.lead_id) && (a.input.outcome === "no_show" ? a.input.follow_up : Boolean(a.input.next_step));
        const message = a.input.outcome === "attended" ? t("meeting.attendedToast") : t("meeting.noShowToast");
        toast.show(
          followUp ? `${message} ${t("meeting.followUpAdded")}` : message,
          followUp ? { kind: "success" } : { kind: "success", action: { label: t("today.undo"), onPress: () => reopen.mutate() } }
        );
      } else if (a.kind === "reschedule") toast.show(t("meeting.rescheduledToast"), { kind: "success" });
      else if (a.kind === "cancel") toast.show(t("meeting.cancelledToast"), { kind: "info" });
      else toast.show(t("meeting.reopenedToast"), { kind: "success" });
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
}

export function useCreateMeeting() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof meetingsApi.create>[1]) => meetingsApi.create(baseId, body),
    onSuccess: ({ meeting }) => {
      haptics.success();
      refreshAfter(qc, baseId, meeting);
    },
  });
}
