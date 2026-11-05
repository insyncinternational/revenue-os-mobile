import { useState } from "react";
import { Linking, StyleSheet, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { agencyApi } from "@/api/agency";
import { userMessage } from "@/api/errors";
import { AGENCY_CURRENCY, clientName, clientState } from "@/features/agency/agency";
import { openClientEdit, openClientPeople, openMoveCredits } from "@/features/agency/navigate";
import { openClientWorkspace } from "@/features/agency/openClient";
import { useAgencyAction, useAgencyCan, useAgencyClient, useIsAgencyAdmin } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { count, dateTime, money, relativeTime } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { HeroCard } from "@/ui/HeroCard";
import {
  ArrowUpCircle,
  CircleMinus,
  KeyRound,
  LogOut,
  Mail,
  MailCheck,
  PauseCircle,
  Pencil,
  RotateCcw,
  Sparkles,
  Users,
  type IconComponent,
} from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, SkeletonDetail } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

/** One client: how it's doing, Open client, credits, its people, notes, and the everyday account actions. */
export default function AgencyClientScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useAgencyClient(id);
  const admin = useIsAgencyAdmin();
  const canCredits = useAgencyCan("manage_credits");
  const canInvite = useAgencyCan("create_clients");
  const canOpen = useAgencyCan("open_clients");

  const d = detail.data;
  const name = d ? clientName(d.client) : "";

  const run = useAgencyAction<"suspend" | "unsuspend" | "restore" | "invite" | "verify" | "reset" | "signout", unknown>((agencyId, action) => {
    switch (action) {
      case "suspend":
        return agencyApi.suspend(agencyId, id);
      case "unsuspend":
        return agencyApi.unsuspend(agencyId, id);
      case "restore":
        return agencyApi.restore(agencyId, id);
      case "invite":
        return agencyApi.inviteLink(agencyId, id);
      case "verify":
        return agencyApi.resendVerification(agencyId, id);
      case "reset":
        return agencyApi.passwordReset(agencyId, id);
      case "signout":
        return agencyApi.signOutEverywhere(agencyId, id);
    }
  }, {
    success: (_r, action) =>
      ({
        suspend: t("agency.done.suspended", { name }),
        unsuspend: t("agency.done.unsuspended", { name }),
        restore: t("agency.done.restored", { name }),
        invite: t("agency.done.inviteSent"),
        verify: t("agency.done.verifySent"),
        reset: t("agency.done.resetSent"),
        signout: t("agency.done.signedOut"),
      })[action],
  });

  const ask = async (action: Parameters<typeof run.mutate>[0], message: string, label: string, destructive = false) => {
    if (await confirm(message, label, t("common.cancel"), destructive)) run.mutate(action);
  };

  if (!d) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <Screen>
          {detail.isPending ? (
            <DelayedFallback>
              <SkeletonDetail />
            </DelayedFallback>
          ) : (
            <ErrorState offline={!online} message={online ? userMessage(detail.error) : undefined} onRetry={() => void detail.refetch()} />
          )}
        </Screen>
      </>
    );
  }

  const state = clientState({ ...d.client, in_trash: d.status.in_trash, paused: d.status.paused });
  const workspaces = d.workspaces;
  const locked = d.status.in_trash || d.status.paused || d.client.suspended;

  const stats = [
    { label: t("agency.stat.leads"), value: count(d.client.leads, locale) },
    { label: t("agency.stat.openDeals"), value: count(d.client.deals_open, locale) },
    { label: t("agency.stat.won"), value: money(d.client.deals_won_value, AGENCY_CURRENCY, locale, { compact: true }) },
  ];

  const actions: ({ key: string; label: string; icon: IconComponent; onPress: () => void; danger?: boolean } | false)[] = [
    admin && !d.status.in_trash && { key: "edit", label: t("agency.action.edit"), icon: Pencil, onPress: () => openClientEdit(id) },
    canInvite && !d.owner.active && { key: "invite", label: t("agency.action.resendInvite"), icon: Mail, onPress: () => void ask("invite", t("agency.ask.invite", { email: d.owner.email }), t("agency.action.send")) },
    admin && d.owner.active && !d.owner.email_verified && { key: "verify", label: t("agency.action.resendVerify"), icon: MailCheck, onPress: () => void ask("verify", t("agency.ask.verify", { email: d.owner.email }), t("agency.action.send")) },
    admin && d.owner.active && d.owner.signs_in_with !== "google" && { key: "reset", label: t("agency.action.passwordReset"), icon: KeyRound, onPress: () => void ask("reset", t("agency.ask.reset", { email: d.owner.email }), t("agency.action.send")) },
    admin && d.owner.active && { key: "signout", label: t("agency.action.signOut"), icon: LogOut, onPress: () => void ask("signout", t("agency.ask.signOut", { name }), t("agency.action.signOutShort")) },
    admin && !d.status.in_trash && !d.status.paused && { key: "suspend", label: t("agency.action.suspend"), icon: PauseCircle, danger: true, onPress: () => void ask("suspend", t("agency.ask.suspend", { name }), t("agency.action.suspendShort"), true) },
    admin && !d.status.in_trash && d.status.paused && !d.status.paused_by_platform && { key: "unsuspend", label: t("agency.action.unsuspend"), icon: ArrowUpCircle, onPress: () => void ask("unsuspend", t("agency.ask.unsuspend", { name }), t("agency.action.unsuspendShort")) },
    admin && d.status.in_trash && !d.status.deleted_by_platform && { key: "restore", label: t("agency.action.restore"), icon: RotateCcw, onPress: () => void ask("restore", t("agency.ask.restore", { name }), t("agency.action.restoreShort")) },
  ];
  const shown = actions.filter((a): a is Exclude<(typeof actions)[number], false> => a !== false);

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <Screen onRefresh={() => void detail.refetch()} refreshing={detail.isRefetching}>
        {!online ? <OfflineBanner /> : null}

        <View style={styles.pad}>
          <HeroCard>
            <View style={styles.heroTop}>
              <Avatar name={name} uri={d.profile.logo_url} size={56} />
              <View style={styles.flex}>
                <Text variant="title" numberOfLines={2} style={{ color: colors.onHero }}>
                  {name}
                </Text>
                <Text variant="subhead" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
                  {d.owner.name ? `${d.owner.name} · ${d.owner.email}` : d.owner.email}
                </Text>
              </View>
            </View>
            {state !== "active" || d.plan ? (
              <View style={styles.badges}>
                {[state !== "active" ? t(`agency.state.${state}`) : null, d.plan?.name ?? null]
                  .filter((x): x is string => Boolean(x))
                  .map((label) => (
                    <View key={label} style={[styles.chip, { backgroundColor: colors.heroGlass }]}>
                      <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.onHero }}>
                        {label}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}
            <View style={styles.stats}>
              {stats.map((s) => (
                <View key={s.label} style={[styles.stat, { backgroundColor: colors.heroGlass }]}>
                  <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.onHero }}>
                    {s.value}
                  </Text>
                  <Text variant="caption" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </HeroCard>
        </View>

        {/* Open client: straight in when there's one workspace; one row per workspace otherwise. */}
        {canOpen && !locked && workspaces.length > 0 ? (
          workspaces.length === 1 ? (
            <View style={styles.pad}>
              <Button label={t("agency.openClient")} icon={ArrowUpCircle} size="lg" fullWidth onPress={() => openClientWorkspace(workspaces[0]!.id)} />
            </View>
          ) : (
            <>
              <SectionHeader title={t("agency.openWorkspace")} />
              <Card padded={false} style={styles.card}>
                {workspaces.map((w, i) => (
                  <View key={w.id}>
                    {i > 0 ? <Divider inset={gutter} /> : null}
                    <ListRow title={w.name} subtitle={t("agency.workspaceFacts", { leads: count(w.leads, locale), members: count(w.members, locale) })} chevron onPress={() => openClientWorkspace(w.id)} />
                  </View>
                ))}
              </Card>
            </>
          )
        ) : null}

        <SectionHeader title={t("agency.client.credits")} />
        <Card style={styles.card} contentStyle={styles.credits}>
          <View style={styles.flex}>
            <Text variant="metric" numeric>
              {count(d.credits.lead_credits, locale)}
            </Text>
            <Text variant="footnote" tone="muted">
              {t("agency.client.creditsSpent", { count: count(d.credits.spent_30d, locale) })}
            </Text>
          </View>
          {canCredits && !d.status.in_trash ? (
            <View style={styles.creditButtons}>
              <Button label={t("agency.credits.give")} icon={Sparkles} size="sm" onPress={() => openMoveCredits({ clientId: id })} />
              {d.credits.lead_credits > 0 ? <Button label={t("agency.credits.takeBack")} icon={CircleMinus} size="sm" variant="secondary" onPress={() => openMoveCredits({ clientId: id, take: true })} /> : null}
            </View>
          ) : null}
        </Card>

        {admin ? (
          <>
            <SectionHeader title={t("agency.client.people")} />
            <Card padded={false} style={styles.card}>
              <ListRow title={t("agency.people.team")} subtitle={t("agency.people.teamHint")} subtitleLines={2} leading={<RowIcon icon={Users} />} chevron onPress={() => openClientPeople(id, "team")} />
              <Divider inset={gutter + 36 + space.md} />
              <ListRow title={t("agency.people.customers")} subtitle={t("agency.people.customersHint")} subtitleLines={2} leading={<RowIcon icon={Users} />} chevron onPress={() => openClientPeople(id, "customers")} />
            </Card>
          </>
        ) : null}

        <SectionHeader title={t("agency.client.owner")} />
        <Card padded={false} style={styles.card}>
          <ListRow title={d.owner.email} subtitle={d.owner.email_verified ? t("agency.owner.verified") : t("agency.owner.notVerified")} leading={<RowIcon icon={Mail} />} onPress={() => void Linking.openURL(`mailto:${d.owner.email}`)} />
          <Divider inset={gutter + 36 + space.md} />
          <ListRow
            title={d.owner.last_login_at ? t("agency.owner.lastLogin", { when: relativeTime(d.owner.last_login_at, locale) }) : t("agency.owner.neverLoggedIn")}
            subtitle={d.owner.created_at ? t("agency.owner.since", { date: dateTime(d.owner.created_at, locale) }) : undefined}
            leading={<RowIcon icon={Users} />}
          />
        </Card>

        {admin && d.notes !== null ? <Notes key={d.notes} clientId={id} initial={d.notes} /> : null}

        {shown.length > 0 ? (
          <>
            <SectionHeader title={t("agency.client.actions")} />
            <Card padded={false} style={styles.card}>
              {shown.map((a, i) => (
                <View key={a.key}>
                  {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                  <ListRow title={a.label} leading={<RowIcon icon={a.icon} danger={a.danger} />} onPress={run.isPending ? undefined : a.onPress} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {d.activity.length > 0 ? (
          <>
            <SectionHeader title={t("agency.client.activity")} />
            <Card padded={false} style={styles.card}>
              {d.activity.slice(0, 8).map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Divider inset={gutter} /> : null}
                  <ListRow title={a.summary || a.action} titleLines={2} subtitle={[a.actor?.name || a.actor?.email, a.created_at ? relativeTime(a.created_at, locale) : null].filter(Boolean).join(" · ")} subtitleLines={1} />
                </View>
              ))}
            </Card>
          </>
        ) : null}
        <Text variant="footnote" tone="muted" align="center" style={styles.webHint}>
          {t("agency.client.webHint")}
        </Text>
      </Screen>
    </>
  );
}

function RowIcon({ icon: Icon, danger }: { icon: IconComponent; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerSurface : colors.surfaceTertiary }]}>
      <Icon size={17} color={danger ? colors.dangerText : colors.textSecondary} strokeWidth={2} />
    </View>
  );
}

/** The agency's private notes about this client (admins only); saved with one tap. */
function Notes({ clientId, initial }: { clientId: number; initial: string }) {
  const { colors } = useTheme();
  const [text, setText] = useState(initial);
  const save = useAgencyAction((agencyId, notes: string) => agencyApi.notes(agencyId, clientId, notes), { success: t("agency.done.notesSaved") });
  const dirty = text.trim() !== initial.trim();
  return (
    <>
      <SectionHeader title={t("agency.client.notes")} />
      <Card style={styles.card} contentStyle={styles.notes}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("agency.client.notesPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={5000}
          style={[styles.notesInput, { color: colors.text, fontFamily: fonts.regular }]}
          accessibilityLabel={t("agency.client.notes")}
        />
        {dirty ? <Button label={t("common.save")} size="sm" loading={save.isPending} onPress={() => save.mutate(text)} style={styles.notesSave} /> : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingTop: space.sm },
  card: { marginHorizontal: gutter },
  flex: { flex: 1, minWidth: 0 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  chip: { height: 26, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center", maxWidth: 220 },
  stats: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  stat: { flex: 1, minWidth: 0, borderRadius: radius.lg, paddingVertical: space.sm + 2, paddingHorizontal: space.md, gap: 2 },
  credits: { flexDirection: "row", alignItems: "center", gap: space.md },
  creditButtons: { gap: space.sm, alignItems: "flex-end" },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notes: { gap: space.sm },
  notesInput: { minHeight: 72, fontSize: 16, lineHeight: 22, textAlignVertical: "top", padding: 0 },
  notesSave: { alignSelf: "flex-end" },
  webHint: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.huge },
});
