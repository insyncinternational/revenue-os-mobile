import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId } from "@/session/workspace";
import type { CrmTask, TaskPage } from "@/types/contact";
import { useToast } from "@/ui/Toast";

export type TaskFilter = "mine" | "all" | "done";

export function useTaskList(filter: TaskFilter, enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  const me = useSession((s) => s.user?.id ?? null);
  return useQuery({
    queryKey: keys.tasks.list(baseId, filter),
    queryFn: ({ signal }) => tasksApi.list(baseId, { status: filter === "done" ? "completed" : "pending", assigneeId: filter === "all" ? null : me }, signal),
    enabled: enabled && baseId > 0 && (filter === "all" || me != null),
    staleTime: 30_000,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[3] === filter ? prev : undefined),
  });
}

/** How many open tasks are assigned to me (the More row): a count, not the 200-row list. */
export function useMyTaskCount(enabled = true): number {
  const baseId = useActiveBaseId() ?? 0;
  const me = useSession((s) => s.user?.id ?? null);
  return (
    useQuery({
      queryKey: keys.tasks.count(baseId, "mine"),
      queryFn: ({ signal }) => tasksApi.count(baseId, { status: "pending", assigneeId: me }, signal),
      enabled: enabled && baseId > 0 && me != null,
      staleTime: 30_000,
    }).data ?? 0
  );
}

/** Everywhere a task shows up: the Tasks lists, Today, and its contact's and deal's screens. */
function refreshTask(qc: QueryClient, baseId: number, task: Pick<CrmTask, "lead_id" | "deal_id">) {
  void qc.invalidateQueries({ queryKey: keys.tasks.all(baseId) });
  void qc.invalidateQueries({ queryKey: ["home", baseId] });
  if (task.lead_id) {
    void qc.invalidateQueries({ queryKey: keys.contacts.tasks(baseId, task.lead_id) });
    void qc.invalidateQueries({ queryKey: keys.contacts.timeline(baseId, task.lead_id) });
  }
  if (task.deal_id) {
    void qc.invalidateQueries({ queryKey: keys.pipeline.dealTasks(baseId, task.deal_id) });
    void qc.invalidateQueries({ queryKey: keys.pipeline.dealTimeline(baseId, task.deal_id) });
  }
}

/**
 * Done / not done: the row leaves its list at once (comes back if the server refuses), and "Done" offers Undo.
 */
export function useToggleTask() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  // Every list a task can sit in: Tasks, a contact's, a deal's (all { tasks: [...] }).
  const lists = [["tasks", baseId, "list"], ["contacts", baseId, "tasks"], ["pipeline", baseId, "dealTasks"]] as const;
  const toggle = useMutation({
    mutationFn: ({ task, done }: { task: CrmTask; done: boolean; quiet?: boolean }) => tasksApi.setStatus(baseId, task.id, done ? "completed" : "pending"),
    onMutate: async ({ task }) => {
      await Promise.all(lists.map((queryKey) => qc.cancelQueries({ queryKey })));
      const snapshot = lists.flatMap((queryKey) => qc.getQueriesData<Partial<TaskPage>>({ queryKey }));
      for (const queryKey of lists) {
        qc.setQueriesData<Partial<TaskPage>>({ queryKey }, (page) =>
          page?.tasks ? { ...page, tasks: page.tasks.filter((x) => x.id !== task.id), ...(page.total != null ? { total: Math.max(0, page.total - 1) } : {}) } : page
        );
      }
      return { snapshot };
    },
    onSuccess: (_r, { task, done, quiet }) => {
      if (done) haptics.success();
      if (quiet) return;
      toast.show(done ? t("today.taskDone") : t("tasks.reopened"), {
        kind: "success",
        action: done ? { label: t("today.undo"), onPress: () => toggle.mutate({ task, done: false, quiet: true }) } : undefined,
      });
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: (_r, _e, { task }) => refreshTask(qc, baseId, task),
  });
  return toggle;
}

export function useSaveTask(id: number | null) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => (id ? tasksApi.update(baseId, id, body) : tasksApi.create(baseId, body)),
    onSuccess: ({ task }) => {
      haptics.success();
      refreshTask(qc, baseId, task);
    },
  });
}

/** A task already loaded in one of the lists (the edit sheet opens filled in). */
export function useCachedTask(id: number): CrmTask | undefined {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  if (!id) return undefined;
  for (const [, data] of qc.getQueriesData<{ tasks: CrmTask[] }>({ queryKey: ["tasks", baseId] })) {
    const hit = data?.tasks?.find((x) => x.id === id);
    if (hit) return hit;
  }
  for (const [, data] of qc.getQueriesData<{ tasks: CrmTask[] }>({ queryKey: ["contacts", baseId, "tasks"] })) {
    const hit = data?.tasks?.find((x) => x.id === id);
    if (hit) return hit;
  }
  for (const [, data] of qc.getQueriesData<{ tasks: CrmTask[] }>({ queryKey: ["pipeline", baseId, "dealTasks"] })) {
    const hit = data?.tasks?.find((x) => x.id === id);
    if (hit) return hit;
  }
  return undefined;
}
