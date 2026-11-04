import { memo } from "react";
import { getIntlLocale, t } from "@/i18n";
import { count, relativeTime } from "@/lib/format";
import type { ClientRow } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { ListRow } from "@/ui/ListRow";
import { clientName, clientState, type ClientState } from "./agency";
import { openAgencyClient } from "./navigate";

const STATE: Record<Exclude<ClientState, "active">, { label: "agency.state.trash" | "agency.state.paused" | "agency.state.suspended" | "agency.state.invited"; tone: BadgeTone }> = {
  trash: { label: "agency.state.trash", tone: "danger" },
  paused: { label: "agency.state.paused", tone: "warning" },
  suspended: { label: "agency.state.suspended", tone: "danger" },
  invited: { label: "agency.state.invited", tone: "info" },
};

/** One client in a list: the business, what it has (leads, credits, last seen), and its state when it isn't simply active. */
export const ClientRowItem = memo(function ClientRowItem({ client, onPress }: { client: ClientRow; onPress?: () => void }) {
  const locale = getIntlLocale();
  const name = clientName(client);
  const state = clientState(client);
  const badge = state === "active" ? null : STATE[state];
  const facts = [
    t("agency.client.leadsCount", { count: count(client.leads, locale) }),
    t("agency.client.creditsCount", { count: count(client.credits_balance, locale) }),
    client.last_active_at ? t("agency.client.seen", { when: relativeTime(client.last_active_at, locale) }) : null,
  ].filter(Boolean);
  return (
    <ListRow
      title={name}
      subtitle={facts.join(" · ")}
      leading={<Avatar name={name} size={40} />}
      trailing={badge ? <Badge label={t(badge.label)} tone={badge.tone} /> : undefined}
      chevron={!badge}
      onPress={onPress ?? (() => openAgencyClient(client.id))}
    />
  );
});
