import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userMessage } from "@/api/errors";
import { workspacesApi } from "@/api/workspaces";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useDebounced } from "@/lib/useDebounced";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId, useWorkspaceList, workspaceKeys } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { AgencyClient, AgencyMembership, Workspace } from "@/types/workspace";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { Check, ICON_STROKE, X } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { SearchBar } from "@/ui/SearchBar";
import { Divider, SectionHeader } from "@/ui/Section";
import { SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** Switch workspace — and, for agency staff, open any client they may access ("Open client" on the web). */
export default function Switcher() {
  const { colors } = useTheme();
  const toast = useToast();
  const activeBaseId = useActiveBaseId();
  const setActiveBase = useSession((s) => s.setActiveBase);
  const list = useWorkspaceList();
  const agencies = useQuery({ queryKey: workspaceKeys.agencies(), queryFn: ({ signal }) => workspacesApi.myAgencies(signal), staleTime: 10 * 60_000 });
  const ownIds = useMemo(() => new Set((list.data?.bases ?? []).map((b) => b.id)), [list.data]);

  const choose = (ws: Pick<Workspace, "id" | "name">) => {
    haptics.selection();
    setActiveBase(ws.id);
    toast.show(t("workspace.switched", { name: ws.name }), { kind: "success" });
    router.back();
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="headline" accessibilityRole="header">
          {t("workspace.title")}
        </Text>
        <IconButton icon={X} label={t("common.close")} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {list.isPending ? (
          <SkeletonList rows={3} />
        ) : list.isError ? (
          <ErrorState message={userMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data.bases.length > 0 ? (
          <>
            <SectionHeader title={t("workspace.yours")} />
            <Card padded={false} style={styles.card}>
              {list.data.bases.map((ws, i) => (
                <View key={ws.id}>
                  {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                  <ListRow
                    title={ws.name}
                    onPress={() => choose(ws)}
                    leading={<Avatar name={ws.name} size={36} />}
                    trailing={ws.id === activeBaseId ? <Check size={20} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} /> : undefined}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {agencies.data?.agencies.map((agency) => (
          <AgencyClients key={agency.id} agency={agency} activeBaseId={activeBaseId} ownIds={ownIds} onChoose={choose} />
        ))}
      </ScrollView>
    </View>
  );
}

type AgencyClientsProps = {
  agency: AgencyMembership;
  activeBaseId: number | null;
  ownIds: ReadonlySet<number>;
  onChoose: (ws: Pick<Workspace, "id" | "name">) => void;
};

function AgencyClients({ agency, activeBaseId, ownIds, onChoose }: AgencyClientsProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const [q, setQ] = useState("");
  const query = useDebounced(q);
  const [expanded, setExpanded] = useState<{ clientId: number; bases: Workspace[] } | null>(null);
  const clients = useQuery({
    queryKey: workspaceKeys.agencyClients(agency.id, query),
    queryFn: ({ signal }) => workspacesApi.agencyClients(agency.id, query, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // A client's workspaces, then open the only one or let the user pick.
  const open = useMutation({
    mutationFn: (client: AgencyClient) => workspacesApi.list(client.id),
    onSuccess: (res, client) => {
      // GET /bases?client= returns the user's own workspaces too; the client's are the ones opened through the
      // agency ("access": "agency"), or — when the user is also a member there — the ones not already listed.
      const viaAgency = res.bases.filter((b) => b.access === "agency");
      const candidates = viaAgency.length ? viaAgency : res.bases.filter((b) => !ownIds.has(b.id));
      if (candidates.length === 0) toast.show(t("workspace.clientNoWorkspace"));
      else if (candidates.length === 1) onChoose({ id: candidates[0]!.id, name: client.business_name || client.name });
      else setExpanded({ clientId: client.id, bases: candidates });
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });

  const rows = clients.data?.clients ?? [];
  return (
    <>
      <SectionHeader title={agency.name ? `${t("workspace.clients")} · ${agency.name}` : t("workspace.clients")} />
      <View style={styles.search}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t("workspace.searchClients")} />
      </View>
      <Card padded={false} style={styles.card}>
        {clients.isPending ? (
          <SkeletonList rows={4} />
        ) : clients.isError ? (
          <ErrorState message={userMessage(clients.error)} onRetry={() => void clients.refetch()} />
        ) : rows.length === 0 ? (
          <Text variant="subhead" tone="muted" align="center" style={styles.empty}>
            {t("workspace.noClients")}
          </Text>
        ) : (
          rows.map((c, i) => {
            const title = c.business_name || c.name;
            const busy = open.isPending && open.variables?.id === c.id;
            return (
              <View key={c.id}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={title}
                  subtitle={c.business_name ? c.name : c.email}
                  leading={<Avatar name={title} size={36} />}
                  trailing={busy ? <ActivityIndicator color={colors.textMuted} /> : c.paused || c.suspended ? <Badge label={t("workspace.paused")} tone="warning" /> : undefined}
                  chevron={!busy}
                  onPress={() => {
                    if (!open.isPending) open.mutate(c);
                  }}
                />
                {expanded?.clientId === c.id
                  ? expanded.bases.map((b) => (
                      <ListRow
                        key={b.id}
                        title={b.name}
                        onPress={() => onChoose({ id: b.id, name: b.name })}
                        leading={<View style={styles.indent} />}
                        trailing={b.id === activeBaseId ? <Check size={20} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} /> : undefined}
                      />
                    ))
                  : null}
              </View>
            );
          })
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: gutter, paddingRight: space.sm, paddingTop: space.md },
  content: { paddingBottom: space.huge },
  card: { marginHorizontal: gutter },
  search: { paddingHorizontal: gutter, paddingBottom: space.sm },
  empty: { padding: space.xl },
  indent: { width: 36 },
});
