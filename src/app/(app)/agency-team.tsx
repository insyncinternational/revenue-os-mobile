import { StyleSheet, View , Alert, Platform } from "react-native";
import { Stack } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { openTeamInvite } from "@/features/agency/navigate";
import { useAgencyAction, useAgencyTeam, useIsAgencyAdmin } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { relativeTime } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useSession } from "@/session/sessionStore";
import { gutter, space } from "@/theme/tokens";
import type { AgencyMemberRole, TeamMember } from "@/types/agency";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { HeaderAction } from "@/ui/HeaderAction";
import { RefreshCw, Trash2, UserPlus } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

const roleText = (r: AgencyMemberRole) => (r === "agency_admin" ? t("role.agency_admin") : t("role.agency_user"));

/** The agency's team: everyone can see it; admins invite, change roles, remove people and handle pending invites. */
export default function AgencyTeamScreen() {
  const online = useOnline();
  const locale = getIntlLocale();
  const me = useSession((s) => s.user?.id);
  const admin = useIsAgencyAdmin();
  const team = useAgencyTeam();

  const member = useAgencyAction(
    (agencyId, v: { userId: number; name: string; role?: AgencyMemberRole; remove?: boolean }) =>
      v.remove ? agencyApi.removeMember(agencyId, v.userId) : agencyApi.setMemberRole(agencyId, v.userId, v.role!),
    { success: (_r, v) => (v.remove ? t("agency.done.removed", { name: v.name }) : t("agency.done.roleChanged", { name: v.name })) }
  );
  const invite = useAgencyAction<{ email: string; cancel: boolean }, unknown>((agencyId, v) => (v.cancel ? agencyApi.cancelTeamInvite(agencyId, v.email) : agencyApi.resendTeamInvite(agencyId, v.email)), {
    success: (_r, v) => (v.cancel ? t("agency.done.inviteCanceled") : t("agency.done.inviteSent")),
  });

  /** The member's choices: make admin / make member, or remove (never yourself). */
  const manage = (m: TeamMember) => {
    const name = m.name || m.email || "";
    const other: AgencyMemberRole = m.role === "agency_admin" ? "agency_user" : "agency_admin";
    const change = { text: other === "agency_admin" ? t("agency.team.makeAdmin") : t("agency.team.makeMember"), onPress: () => member.mutate({ userId: m.user_id, name, role: other }) };
    const remove = {
      text: t("agency.team.remove"),
      style: "destructive" as const,
      onPress: () => void confirm(t("agency.ask.remove", { name }), t("agency.team.remove"), t("common.cancel"), true).then((ok) => ok && member.mutate({ userId: m.user_id, name, remove: true })),
    };
    if (Platform.OS === "web") {
      void confirm(`${change.text}?`, change.text, t("common.cancel")).then((ok) => ok && change.onPress());
      return;
    }
    Alert.alert(name, roleText(m.role), [change, remove, { text: t("common.cancel"), style: "cancel" }]);
  };

  if (!team.data) {
    return (
      <>
        <Stack.Screen options={{ title: t("agency.team.title"), headerRight: () => (admin ? <HeaderAction size={40} label={t("agency.team.invite")} icon={UserPlus} onPress={openTeamInvite} /> : null) }} />
        <Screen>
          {team.isPending ? (
            <DelayedFallback>
              <SkeletonList rows={5} />
            </DelayedFallback>
          ) : (
            <ErrorState offline={!online} message={online ? userMessage(team.error) : undefined} onRetry={() => void team.refetch()} />
          )}
        </Screen>
      </>
    );
  }

  const invites = team.data.invites ?? [];
  return (
    <>
      <Stack.Screen options={{ title: t("agency.team.title"), headerRight: () => (admin ? <HeaderAction size={40} label={t("agency.team.invite")} icon={UserPlus} onPress={openTeamInvite} /> : null) }} />
      <View style={styles.fill}>
        <Screen onRefresh={() => void team.refetch()} refreshing={team.isRefetching}>
          {!online ? <OfflineBanner /> : null}
          <SectionHeader title={t("agency.team.members")} count={team.data.members.length} />
          <Card padded={false} style={styles.card}>
            {team.data.members.map((m, i) => {
              const name = m.name || m.email || "";
              return (
                <View key={m.user_id}>
                  {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                  <ListRow
                    title={m.user_id === me ? t("agency.team.you", { name }) : name}
                    subtitle={[m.email, m.last_active_at ? relativeTime(m.last_active_at, locale) : null].filter(Boolean).join(" · ")}
                    leading={<Avatar name={name} size={36} />}
                    trailing={<Badge label={m.active ? roleText(m.role) : t("agency.state.invited")} tone={m.role === "agency_admin" ? "brand" : m.active ? "neutral" : "info"} />}
                    onPress={admin && m.user_id !== me ? () => manage(m) : undefined}
                  />
                </View>
              );
            })}
          </Card>

          {invites.length > 0 ? (
            <>
              <SectionHeader title={t("agency.team.pending")} count={invites.length} />
              <Card padded={false} style={styles.card}>
                {invites.map((inv, i) => (
                  <View key={inv.email}>
                    {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                    <ListRow
                      title={inv.email}
                      subtitle={[roleText(inv.role), inv.invited_at ? relativeTime(inv.invited_at, locale) : null].filter(Boolean).join(" · ")}
                      leading={<Avatar name={inv.email} size={36} />}
                      trailing={
                        admin ? (
                          <View style={styles.row}>
                            <IconButton icon={RefreshCw} label={t("agency.action.resendInvite")} size={18} onPress={() => invite.mutate({ email: inv.email, cancel: false })} />
                            <IconButton
                              icon={Trash2}
                              label={t("agency.action.cancelInvite")}
                              tone="danger"
                              size={18}
                              onPress={() => void confirm(t("agency.ask.cancelInvite", { email: inv.email }), t("agency.action.cancelInvite"), t("common.cancel"), true).then((ok) => ok && invite.mutate({ email: inv.email, cancel: true }))}
                            />
                          </View>
                        ) : undefined
                      }
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          <Text variant="footnote" tone="muted" align="center" style={styles.hint}>
            {admin ? t("agency.team.footer") : t("agency.team.footerMember")}
          </Text>
        </Screen>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { marginHorizontal: gutter },
  row: { flexDirection: "row", alignItems: "center" },
  hint: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: 120 },
});
