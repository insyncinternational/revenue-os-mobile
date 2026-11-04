/**
 * The agency's alerts: the notifications the backend sends to agency admins (new client signed up, payment failed,
 * plan or trial ended, agency on hold, auto top-up failed, credit pool ran out). They are account-wide "billing"
 * notifications carrying `metadata.agency_id` (backend services/agencyBilling/shared.ts notifyAgencyAdmins).
 */
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { agencyAlertsOf } from "./agency";
import { useAgencyId } from "./useAgency";

/** Kept under ["notifications", "feed", …] so marking read updates it with every other feed. */
const alertsKey = (agencyId: number) => ["notifications", "feed", "agency", agencyId] as const;

/** The agency's latest alerts and how many are unread. */
export function useAgencyAlerts() {
  const id = useAgencyId();
  const query = useQuery({
    queryKey: alertsKey(id),
    // The pages hold InfiniteData elsewhere; this one is a single page shaped the same way so markLocally fits it.
    queryFn: async ({ signal }) => {
      const page = await notificationsApi.list({ baseId: null, offset: 0, limit: 50, category: "billing" }, signal);
      return { pages: [{ ...page, notifications: agencyAlertsOf(page.notifications, id) }], pageParams: [0] };
    },
    enabled: id > 0,
    staleTime: 30_000,
  });
  const rows = query.data?.pages[0]?.notifications ?? [];
  return { ...query, rows, unread: rows.filter((n) => !n.read_at).length };
}
