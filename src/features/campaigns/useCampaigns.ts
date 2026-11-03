import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/api/campaigns";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useActiveBaseId, useCan, useModuleEnabled } from "@/session/workspace";
import type { Campaign } from "@/types/campaign";
import { useToast } from "@/ui/Toast";

/** Campaigns module on and allowed to read them. */
export function useCampaignsVisible(): boolean {
  const moduleOn = useModuleEnabled("campaigns");
  const allowed = useCan("campaigns_read");
  return moduleOn && allowed;
}

export function useCampaigns(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.campaigns.list(baseId),
    queryFn: ({ signal }) => campaignsApi.list(baseId, signal),
    enabled: enabled && baseId > 0,
    staleTime: 60_000,
    select: (r) => r.campaigns,
  });
}

/** Pause: the card shows "Paused" at once, and goes back if the server refuses. */
export function usePauseCampaign() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  const key = keys.campaigns.list(baseId);
  return useMutation({
    mutationFn: (c: Campaign) => campaignsApi.pause(c.id),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData(key);
      qc.setQueryData<{ campaigns: Campaign[] }>(key, (d) => (d ? { campaigns: d.campaigns.map((x) => (x.id === c.id ? { ...x, status: "paused" } : x)) } : d));
      return { snapshot };
    },
    onSuccess: (_r, c) => {
      haptics.success();
      toast.show(t("campaigns.pausedToast", { name: c.name }), { kind: "success" });
    },
    onError: (e, _c, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
      toast.show(userMessage(e), { kind: "error" });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.campaigns.all(baseId) }),
  });
}
