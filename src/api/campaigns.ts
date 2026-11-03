import type { Campaign } from "@/types/campaign";
import { api } from "./client";

/**
 * Campaigns, read-only on the phone except Pause (backend routes/campaigns). Resuming re-runs the launch checks with
 * the schedule and pacing on the web (POST /:id/start), so it — and building campaigns — stays there.
 */
export const campaignsApi = {
  list: (baseId: number, signal?: AbortSignal) => api.get<{ campaigns: Campaign[] }>("/campaigns", { base_id: baseId }, signal),
  /** The same PUT the web's list uses for Pause. */
  pause: (id: number) => api.put<{ campaign: Campaign }>(`/campaigns/${id}`, { status: "paused" }),
};
