import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeApi } from "@/api/home";

import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { storage } from "@/lib/storage";
import { keys } from "@/query/keys";
import { useActiveBaseId } from "@/session/workspace";
import type { MyDayPlan } from "@/types/home";
import { useToast } from "@/ui/Toast";

export type Period = 7 | 30 | 90;
const PERIOD_KEY = "pref.today.period";

function savedPeriod(): Period {
  const v = storage.getNumber(PERIOD_KEY);
  return v === 7 || v === 90 ? v : 30;
}

/** Everything the Today screen shows, for the active workspace. Cached data renders first; refreshes run quietly. */
export function useToday() {
  const baseId = useActiveBaseId();
  const [period, setPeriodState] = useState<Period>(savedPeriod);
  const setPeriod = (p: Period) => {
    storage.set(PERIOD_KEY, p);
    setPeriodState(p);
  };

  const home = useQuery({
    queryKey: keys.home(baseId ?? 0, period),
    queryFn: ({ signal }) => homeApi.get(baseId!, period, signal),
    enabled: baseId != null,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const plan = useQuery({
    queryKey: [...keys.home(baseId ?? 0, 0), "plan"] as const,
    queryFn: ({ signal }) => homeApi.plan(baseId!, signal),
    enabled: baseId != null,
    staleTime: 60_000,
  });


  return { baseId, period, setPeriod, home, plan };
}

/** Complete a task from the plan: it disappears at once, comes back if the server refuses, and can be undone. */
export function useCompleteTask() {
  const baseId = useActiveBaseId();
  const qc = useQueryClient();
  const toast = useToast();
  const planKey = [...keys.home(baseId ?? 0, 0), "plan"] as const;
  // The Tasks screen and its counts show the same task: refresh them with Today.
  const refreshTasks = () => void qc.invalidateQueries({ queryKey: keys.tasks.all(baseId ?? 0) });

  const undo = useMutation({
    mutationFn: (taskId: number) => homeApi.setTaskStatus(baseId!, taskId, "pending"),
    onSettled: () => {
      refreshTasks();
      return qc.invalidateQueries({ queryKey: planKey });
    },
  });

  return useMutation({
    mutationFn: ({ taskId }: { taskId: number; itemId: string }) => homeApi.setTaskStatus(baseId!, taskId, "completed"),
    onMutate: async ({ itemId }) => {
      await qc.cancelQueries({ queryKey: planKey });
      const before = qc.getQueryData<MyDayPlan>(planKey);
      if (before) qc.setQueryData<MyDayPlan>(planKey, { ...before, items: before.items.filter((i) => i.id !== itemId) });
      haptics.success();
      return { before };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.before) qc.setQueryData(planKey, ctx.before);
      toast.show(userMessage(e), { kind: "error" });
    },
    onSuccess: (_d, { taskId }) => {
      toast.show(t("today.taskDone"), { kind: "success", action: { label: t("today.undo"), onPress: () => undo.mutate(taskId) } });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.home(baseId ?? 0, 0).slice(0, 2) });
      refreshTasks();
    },
  });
}
