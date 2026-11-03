import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type NotificationPreference } from "@/api/notifications";
import { userMessage } from "@/api/errors";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useToast } from "@/ui/Toast";

export function useNotificationPreferences() {
  return useQuery({
    queryKey: keys.notifications.preferences(),
    queryFn: ({ signal }) => notificationsApi.preferences(signal),
    staleTime: 5 * 60_000,
    meta: { persist: false },
  });
}

/** One switch: flips at once, flips back if the server refuses. */
export function useSetPreference() {
  const qc = useQueryClient();
  const toast = useToast();
  const key = keys.notifications.preferences();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: { push?: boolean; email?: boolean } }) => notificationsApi.setPreference(id, change),
    onMutate: async ({ id, change }) => {
      haptics.selection();
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<{ categories: NotificationPreference[] }>(key);
      if (before) qc.setQueryData(key, { categories: before.categories.map((c) => (c.id === id ? { ...c, ...change } : c)) });
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
      toast.show(userMessage(e), { kind: "error" });
    },
  });
}
