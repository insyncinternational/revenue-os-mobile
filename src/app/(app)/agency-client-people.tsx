import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { useAgencyAction, useClientCustomers, useClientTeam } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { relativeTime } from "@/lib/format";
import { useDebounced } from "@/lib/useDebounced";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import type { ClientTeam, PortalCustomerRow } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { RefreshCw, Trash2, Users } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { SearchBar } from "@/ui/SearchBar";
import { Divider, SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

type Tab = "team" | "customers";

/** A client's people (agency admins): its workspace team (access on/off, pending invites) and its portal customers. */
export default function ClientPeopleScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>(params.tab === "customers" ? "customers" : "team");
  return (
    <>
      <Stack.Screen options={{ title: t("agency.client.people") }} />
      <Screen>
        <View style={styles.pad}>
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: "team", label: t("agency.people.team") },
              { key: "customers", label: t("agency.people.customers") },
            ]}
          />
        </View>
        {tab === "team" ? <TeamTab clientId={id} /> : <CustomersTab clientId={id} />}
      </Screen>
    </>
  );
}

function TeamTab({ clientId }: { clientId: number }) {
  const online = useOnline();
  const locale = getIntlLocale();
  const team = useClientTeam(clientId);
  const access = useAgencyAction(
    (agencyId, v: { workspaceId: number; userId: number; off: boolean; name: string }) => agencyApi.clientTeamUpdate(agencyId, clientId, v.workspaceId, v.userId, { access_disabled: v.off }),
    { success: (_r, v) => (v.off ? t("agency.done.accessOff", { name: v.name }) : t("agency.done.accessOn", { name: v.name })) }
  );
  const invite = useAgencyAction(
    (agencyId, v: { workspaceId: number; invitationId: number; cancel: boolean }) =>
      v.cancel ? agencyApi.clientInviteRevoke(agencyId, clientId, v.workspaceId, v.invitationId) : agencyApi.clientInviteResend(agencyId, clientId, v.workspaceId, v.invitationId),
    { success: (_r, v) => (v.cancel ? t("agency.done.inviteCanceled") : t("agency.done.inviteSent")) }
  );

  if (!team.data) {
    return team.isPending ? (
      <DelayedFallback>
        <SkeletonList rows={5} />
      </DelayedFallback>
    ) : (
      <ErrorState offline={!online} message={online ? userMessage(team.error) : undefined} onRetry={() => void team.refetch()} />
    );
  }

  const toggle = async (w: ClientTeam["workspaces"][number], m: ClientTeam["workspaces"][number]["members"][number]) => {
    const name = m.name || m.email;
    const off = !m.access_disabled;
    if (await confirm(off ? t("agency.ask.accessOff", { name }) : t("agency.ask.accessOn", { name }), off ? t("agency.action.accessOff") : t("agency.action.accessOn"), t("common.cancel"), off)) {
      access.mutate({ workspaceId: w.id, userId: m.user_id, off, name });
    }
  };

  return (
    <>
      {team.data.workspaces.map((w) => (
        <View key={w.id}>
          <SectionHeader title={w.name} right={<Text variant="footnote" tone="muted" numeric>{t("agency.people.seats", { used: w.seats.used, total: w.seats.total })}</Text>} />
          <Card padded={false} style={styles.card}>
            {w.members.map((m, i) => (
              <View key={m.user_id}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={m.name || m.email}
                  subtitle={[roleLabel(m.role, m.is_owner), m.last_login_at ? relativeTime(m.last_login_at, locale) : t("agency.owner.neverLoggedIn")].join(" · ")}
                  leading={<Avatar name={m.name || m.email} size={36} />}
                  trailing={m.access_disabled ? <Badge label={t("agency.people.accessOff")} tone="danger" /> : undefined}
                  onPress={m.is_owner ? undefined : () => void toggle(w, m)}
                />
              </View>
            ))}
            {w.invitations.map((inv) => (
              <View key={`i-${inv.id}`}>
                <Divider inset={gutter + 36 + space.md} />
                <ListRow
                  title={inv.email}
                  subtitle={inv.expired ? t("agency.people.inviteExpired") : t("agency.people.invitePending", { role: roleLabel(inv.role, false) })}
                  leading={<Avatar name={inv.email} size={36} />}
                  trailing={
                    <View style={styles.inviteActions}>
                      <IconButton icon={RefreshCw} label={t("agency.action.resendInvite")} size={18} onPress={() => invite.mutate({ workspaceId: w.id, invitationId: inv.id, cancel: false })} />
                      <IconButton
                        icon={Trash2}
                        label={t("agency.action.cancelInvite")}
                        tone="danger"
                        size={18}
                        onPress={() => void confirm(t("agency.ask.cancelInvite", { email: inv.email }), t("agency.action.cancelInvite"), t("common.cancel"), true).then((ok) => ok && invite.mutate({ workspaceId: w.id, invitationId: inv.id, cancel: true }))}
                      />
                    </View>
                  }
                />
              </View>
            ))}
          </Card>
        </View>
      ))}
      <Text variant="footnote" tone="muted" align="center" style={styles.hint}>
        {t("agency.people.teamFooter")}
      </Text>
    </>
  );
}

function roleLabel(role: string, owner: boolean): string {
  if (owner) return t("agency.role.owner");
  if (role === "admin") return t("agency.role.admin");
  if (role === "viewer") return t("agency.role.viewer");
  return t("agency.role.editor");
}

const CUSTOMER: Record<PortalCustomerRow["access"], { label: "agency.cust.ok" | "agency.cust.blocked" | "agency.cust.clientSuspended" | "agency.cust.clientTrash"; tone: BadgeTone }> = {
  ok: { label: "agency.cust.ok", tone: "success" },
  blocked: { label: "agency.cust.blocked", tone: "danger" },
  client_suspended: { label: "agency.cust.clientSuspended", tone: "warning" },
  client_in_trash: { label: "agency.cust.clientTrash", tone: "warning" },
};

function CustomersTab({ clientId }: { clientId: number }) {
  const online = useOnline();
  const locale = getIntlLocale();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const list = useClientCustomers(clientId, q);
  const block = useAgencyAction((agencyId, v: { customerId: number; block: boolean; email: string }) => agencyApi.customerBlock(agencyId, clientId, v.customerId, v.block), {
    success: (_r, v) => (v.block ? t("agency.done.blocked", { email: v.email }) : t("agency.done.unblocked", { email: v.email })),
  });
  const rows = list.data?.customers ?? [];

  const toggle = async (c: PortalCustomerRow) => {
    const blocking = c.status !== "disabled";
    if (await confirm(blocking ? t("agency.ask.block", { email: c.email }) : t("agency.ask.unblock", { email: c.email }), blocking ? t("agency.action.block") : t("agency.action.unblock"), t("common.cancel"), blocking)) {
      block.mutate({ customerId: c.id, block: blocking, email: c.email });
    }
  };

  return (
    <>
      <View style={styles.pad}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t("agency.people.searchCustomers")} />
      </View>
      {list.isPending ? (
        <SkeletonList rows={5} />
      ) : list.isError ? (
        <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={t("agency.people.noCustomersTitle")} message={q ? t("agency.clients.noMatchMessage") : t("agency.people.noCustomersMessage")} />
      ) : (
        <Card padded={false} style={styles.card}>
          {rows.map((c, i) => {
            const badge = c.status === "invited" && c.access === "ok" ? { label: "agency.cust.invited" as const, tone: "info" as BadgeTone } : CUSTOMER[c.access];
            return (
              <View key={c.id}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={c.name || c.email}
                  subtitle={[c.name ? c.email : null, c.last_login_at ? t("agency.owner.lastLogin", { when: relativeTime(c.last_login_at, locale) }) : null].filter(Boolean).join(" · ")}
                  leading={<Avatar name={c.name || c.email} size={36} />}
                  trailing={<Badge label={t(badge.label)} tone={badge.tone} />}
                  onPress={c.access === "ok" || c.access === "blocked" ? () => void toggle(c) : undefined}
                />
              </View>
            );
          })}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingVertical: space.sm },
  card: { marginHorizontal: gutter },
  inviteActions: { flexDirection: "row", alignItems: "center" },
  hint: { paddingHorizontal: gutter, paddingVertical: space.xl },
});
