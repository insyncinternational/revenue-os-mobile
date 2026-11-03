import { useState, type ReactNode } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userMessage } from "@/api/errors";
import { dial } from "@/features/contacts/callFollowUp";
import { dialable, fullName, headline, whatsappLink } from "@/features/contacts/contact";
import { Timeline } from "@/features/contacts/Timeline";
import { useAddNote, useContact } from "@/features/contacts/useContacts";
import { TaskRow } from "@/features/tasks/TaskRow";
import { useToggleTask } from "@/features/tasks/useTasks";
import { getIntlLocale, t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { dateTime, money } from "@/lib/format";
import { openContactForm, openDeal, openDealForm, openInvoiceForm, openMeeting, openMeetingForm, openTaskForm } from "@/lib/navigate";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { channelColors, gutter, radius, space, type Palette } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Briefcase, Building, CalendarDays, CalendarPlus, ChevronRight, Factory, ICON_STROKE, KanbanSquare, ListTodo, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Receipt, type IconComponent } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { Input } from "@/ui/Input";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { Divider } from "@/ui/Section";
import { DelayedFallback, Skeleton, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { WhatsAppIcon } from "@/ui/BrandIcons";

type Tab = "activity" | "deals" | "meetings" | "tasks";
type Reach = { key: string; label: string; icon?: IconComponent; glyph?: ReactNode; run: () => void };

/**
 * Everything about one person on one screen: who they are and three numbers at the top, the details, then
 * Activity / Deals / Meetings / Tasks as tabs — and the best way to reach them pinned at the bottom, a thumb away.
 */
export default function ContactScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = getIntlLocale();
  const { contact, timeline, tasks, deals } = useContact(id);
  const crm = useModuleEnabled("crm");
  const meetingsOn = useModuleEnabled("meetings");
  const canEdit = useCan("contacts_edit");
  const canNote = useCan("contacts_create");
  const seeMoney = useCan("deals_money");
  const canBookMeeting = useCan("meetings_edit");
  const canAddTask = useCan("tasks_create");
  const canEditTasks = useCan("tasks_edit");
  const canInvoice = useCan("invoices_edit");
  const canBook = meetingsOn && canBookMeeting;
  const toggleTask = useToggleTask();
  const addNote = useAddNote(id);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<Tab>("activity");
  // Read once per visit so render stays pure ("overdue" is about now-ish, not the exact millisecond).
  const [now] = useState(() => Date.now());
  const [nowDate] = useState(() => new Date(now));

  const c = contact.data;
  const name = c ? fullName(c) : "";
  const phone = dialable(c?.phone);
  const wa = whatsappLink(c?.phone);
  const pendingTasks = tasks.data?.tasks ?? [];
  // Meetings are tasks of type "meeting": shown as meetings, never in the to-do list.
  const upcoming = pendingTasks.filter((x) => x.task_type === "meeting").sort((a, b) => Date.parse(a.due_at ?? "") - Date.parse(b.due_at ?? ""));
  const openTasks = pendingTasks.filter((x) => x.task_type !== "meeting");
  const dealList = deals.data?.deals ?? [];

  // The tabs this workspace has, each with its count (also the three numbers under the name).
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "activity", label: t("contacts.activity") },
    ...(crm ? [{ key: "deals" as const, label: t("contacts.deals"), count: dealList.length }] : []),
    ...(meetingsOn ? [{ key: "meetings" as const, label: t("contacts.meetings"), count: upcoming.length }] : []),
    ...(crm ? [{ key: "tasks" as const, label: t("contacts.tasks"), count: openTasks.length }] : []),
  ];
  // Only the ones with something in them: three big zeros say nothing (the tabs say "none yet" with a button).
  const stats = tabs.filter((x) => (x.count ?? 0) > 0);

  // Ways to reach them, best first: the first is the big ink button, the next three are round buttons beside it.
  const reach = (
    [
      phone && { key: "call", label: t("contacts.call"), icon: Phone, run: () => dial(phone, id, name) },
      c?.email && { key: "email", label: t("contacts.email"), icon: Mail, run: () => void Linking.openURL(`mailto:${c.email}`) },
      phone && { key: "text", label: t("contacts.text"), icon: MessageSquare, run: () => void Linking.openURL(`sms:${phone}`) },
      wa && { key: "whatsapp", label: t("contacts.whatsapp"), glyph: <WhatsAppIcon size={22} color={channelColors.whatsapp} />, run: () => void Linking.openURL(wa) },
      !phone && canEdit && { key: "phone", label: t("contacts.addPhone"), icon: Plus, run: () => openContactForm(id) },
      canInvoice && { key: "invoice", label: t("contacts.invoice"), icon: Receipt, run: () => openInvoiceForm({ leadId: id }) },
    ] as (Reach | false | null | undefined | "")[]
  ).filter((r): r is Reach => !!r);
  const [main, ...more] = reach;

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (c && canEdit ? <IconButton icon={Pencil} label={t("contacts.edit")} circle size={19} onPress={() => openContactForm(id)} /> : null),
        }}
      />
      <Screen
        onRefresh={() => void Promise.all([contact.refetch(), timeline.refetch(), tasks.refetch(), deals.refetch()])}
        refreshing={contact.isRefetching}
        contentContainerStyle={{ paddingBottom: BAR_SPACE + insets.bottom }}
      >
        {!c ? (
          contact.isPending ? (
            <DelayedFallback>
              <ProfileSkeleton />
            </DelayedFallback>
          ) : (
            <View style={styles.errorPad}>
              <ErrorState message={userMessage(contact.error)} onRetry={() => void contact.refetch()} />
            </View>
          )
        ) : (
          <>
            <View style={styles.profile}>
              <View style={[styles.avatarLift, { boxShadow: colors.cardShadow }]}>
                <Avatar name={name} size={92} />
              </View>
              <View style={styles.nameRow}>
                <Text variant="title" align="center" numberOfLines={2} accessibilityRole="header" style={styles.name}>
                  {name}
                </Text>
                {c.tier ? <Badge label={c.tier} tone="success" /> : null}
              </View>
              {headline(c) ? (
                <Text variant="callout" tone="secondary" align="center" numberOfLines={1}>
                  {headline(c)}
                </Text>
              ) : null}
            </View>

            {/* Up to three numbers at a glance; each opens its tab. */}
            {stats.length > 0 ? (
              <View style={styles.stats}>
                {stats.map((s) => (
                  <PressableScale
                    key={s.key}
                    onPress={() => setTab(s.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.label}: ${s.count ?? 0}`}
                    style={[styles.stat, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
                  >
                    <Text variant="metric" numeric numberOfLines={1}>
                      {s.count ?? 0}
                    </Text>
                    <Text variant="footnote" tone="muted" weight="medium" numberOfLines={1}>
                      {s.label}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ) : null}

            <Reveal index={0}>
              <Card padded={false} style={styles.card}>
                {/* Only filled-in fields, each with its own colour; dividers go between the rows actually shown. */}
                {(
                  [
                    { icon: Mail, tone: TONES.info, label: t("contacts.email"), value: c.email, onPress: c.email ? () => void Linking.openURL(`mailto:${c.email}`) : undefined },
                    { icon: Phone, tone: TONES.success, label: t("contacts.phone"), value: c.phone, onPress: phone ? () => dial(phone, id, name) : undefined },
                    { icon: Building, tone: TONES.warning, label: t("contacts.company"), value: c.company },
                    { icon: Briefcase, tone: TONES.primary, label: t("contacts.role"), value: c.role },
                    { icon: MapPin, tone: TONES.danger, label: t("contacts.region"), value: c.region },
                    { icon: Factory, tone: TONES.neutral, label: t("contacts.industry"), value: c.industry },
                  ] as { icon: IconComponent; tone: Tone; label: string; value: string | null; onPress?: () => void }[]
                )
                  .filter((d) => d.value && d.value.trim())
                  .map((d, i, shown) => (
                    <Detail key={d.label} icon={d.icon} tone={d.tone} label={d.label} value={d.value} onPress={d.onPress} last={i === shown.length - 1} />
                  ))}
              </Card>
            </Reveal>

            {/* Tabs: one list at a time instead of four stacked sections. */}
            <Reveal index={1}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabs, { borderBottomColor: colors.border }]} accessibilityRole="tablist">
                {tabs.map((x) => {
                  const active = x.key === tab;
                  return (
                    <PressableScale
                      key={x.key}
                      onPress={() => {
                        if (!active) haptics.selection();
                        setTab(x.key);
                      }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      scaleTo={0.97}
                      style={[styles.tab, { borderBottomColor: active ? colors.primary : "transparent" }]}
                    >
                      <Text variant="callout" weight={active ? "bold" : "medium"} tone={active ? "default" : "muted"} numberOfLines={1}>
                        {x.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>

              <View style={styles.block}>
                {tab === "activity" ? (
                  <>
                    {crm && canNote ? (
                      <Card contentStyle={styles.noteBox}>
                        <Input value={note} onChangeText={setNote} placeholder={t("contacts.addNote")} multiline style={styles.noteInput} />
                        {note.trim() ? (
                          <Button
                            label={t("contacts.saveNote")}
                            size="sm"
                            loading={addNote.isPending}
                            onPress={() => addNote.mutate(note.trim(), { onSuccess: () => setNote("") })}
                            style={styles.noteSave}
                          />
                        ) : null}
                      </Card>
                    ) : null}
                    {timeline.isPending ? <SkeletonList rows={3} /> : <Timeline items={timeline.data?.timeline ?? []} locale={locale} />}
                  </>
                ) : null}

                {tab === "deals" ? (
                  <TabList
                    empty={t("contacts.noDeals")}
                    action={canNote ? { label: t("pipeline.add"), icon: KanbanSquare, run: () => openDealForm({ leadId: id }) } : undefined}
                    loading={!deals.data}
                  >
                    {dealList.length > 0 ? (
                      <Card padded={false}>
                        {dealList.map((d, i) => (
                          <View key={d.id}>
                            {i > 0 ? <Divider inset={space.lg} /> : null}
                            <PressableScale onPress={() => openDeal(d.id)} accessibilityLabel={d.name} scaleTo={0.99} style={styles.row}>
                              <View style={styles.flex}>
                                <Text variant="callout" weight="semibold" numberOfLines={1}>
                                  {d.name}
                                </Text>
                                {d.stage?.name ? <Badge label={d.stage.name} tone="brand" /> : null}
                              </View>
                              {seeMoney && d.amount != null ? (
                                <Text variant="headline" numeric>
                                  {money(d.amount, d.currency ?? "USD", locale, { compact: d.amount >= 100_000 })}
                                </Text>
                              ) : null}
                              <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
                            </PressableScale>
                          </View>
                        ))}
                      </Card>
                    ) : null}
                  </TabList>
                ) : null}

                {tab === "meetings" ? (
                  <TabList
                    empty={t("contacts.noMeetings")}
                    action={canBook ? { label: t("meeting.book"), icon: CalendarPlus, run: () => openMeetingForm({ leadId: id }) } : undefined}
                    loading={!tasks.data}
                  >
                    {upcoming.length > 0 ? (
                      <Card padded={false}>
                        {upcoming.map((m, i) => (
                          <View key={m.id}>
                            {i > 0 ? <Divider inset={space.lg + 36 + space.md} /> : null}
                            <PressableScale onPress={() => openMeeting(m.id)} accessibilityLabel={m.title} scaleTo={0.99} style={styles.row}>
                              <View style={[styles.detailIcon, { backgroundColor: colors.warningSurface }]}>
                                <CalendarDays size={17} color={colors.warning} strokeWidth={ICON_STROKE} />
                              </View>
                              <View style={styles.flex}>
                                <Text variant="callout" weight="semibold" numberOfLines={1}>
                                  {m.title}
                                </Text>
                                {m.due_at ? (
                                  <Text variant="footnote" tone={Date.parse(m.due_at) < now ? "warning" : "muted"}>
                                    {dateTime(m.due_at, locale)}
                                  </Text>
                                ) : null}
                              </View>
                              <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
                            </PressableScale>
                          </View>
                        ))}
                      </Card>
                    ) : null}
                  </TabList>
                ) : null}

                {tab === "tasks" ? (
                  <TabList
                    empty={t("contacts.noTasks")}
                    action={canAddTask ? { label: t("contacts.addTask"), icon: ListTodo, run: () => openTaskForm({ leadId: id }) } : undefined}
                    loading={!tasks.data}
                  >
                    {openTasks.length > 0 ? (
                      <View style={styles.taskList}>
                        {openTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            now={nowDate}
                            locale={locale}
                            canEdit={canEditTasks}
                            showContact={false}
                            onToggle={(x) => toggleTask.mutate({ task: x, done: true })}
                            onOpen={(x) => openTaskForm({ id: x.id })}
                          />
                        ))}
                      </View>
                    ) : null}
                  </TabList>
                ) : null}
              </View>
            </Reveal>
          </>
        )}
      </Screen>

      {/* The best way to reach them, pinned at the bottom over a soft fade: one ink pill and up to three round buttons. */}
      {c && main ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]} pointerEvents="box-none">
          <View style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(180deg, transparent, ${colors.background} 42%)` }]} pointerEvents="none" />
          <PressableScale
            onPress={() => {
              haptics.light();
              main.run();
            }}
            accessibilityRole="button"
            accessibilityLabel={main.label}
            scaleTo={0.97}
            style={[styles.mainAction, { backgroundColor: colors.ink }]}
          >
            {main.glyph ?? (main.icon ? <main.icon size={19} color={colors.onInk} strokeWidth={ICON_STROKE + 0.25} /> : null)}
            <Text variant="callout" weight="semibold" style={{ color: colors.onInk }} numberOfLines={1}>
              {main.label}
            </Text>
          </PressableScale>
          {more.slice(0, 3).map((r) => (
            <PressableScale
              key={r.key}
              onPress={() => {
                haptics.selection();
                r.run();
              }}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              scaleTo={0.94}
              style={[styles.round, { backgroundColor: colors.surface, boxShadow: colors.cardShadow }]}
            >
              {r.glyph ?? (r.icon ? <r.icon size={21} color={colors.text} strokeWidth={ICON_STROKE + 0.25} /> : null)}
            </PressableScale>
          ))}
        </View>
      ) : null}
    </>
  );
}

/** One tab's list, or a short line saying it's empty with the button that fills it. */
function TabList({ children, empty, action, loading }: { children: ReactNode; empty: string; action?: { label: string; icon: IconComponent; run: () => void }; loading?: boolean }) {
  if (loading) return <SkeletonList rows={2} />;
  if (children) {
    return (
      <View style={styles.tabList}>
        {children}
        {action ? <Button label={action.label} icon={action.icon} size="sm" variant="secondary" onPress={action.run} /> : null}
      </View>
    );
  }
  return (
    <Card contentStyle={styles.emptyTab}>
      <Text variant="callout" tone="secondary">
        {empty}
      </Text>
      {action ? <Button label={action.label} icon={action.icon} size="sm" variant="secondary" onPress={action.run} /> : null}
    </Card>
  );
}

type Tone = { bg: keyof Palette; fg: keyof Palette };
const TONES = {
  info: { bg: "infoSurface", fg: "info" },
  success: { bg: "successSurface", fg: "success" },
  warning: { bg: "warningSurface", fg: "warning" },
  primary: { bg: "primarySubtle", fg: "primary" },
  danger: { bg: "dangerSurface", fg: "danger" },
  neutral: { bg: "surfaceTertiary", fg: "textSecondary" },
} as const satisfies Record<string, Tone>;

function Detail({ icon: Icon, tone, label, value, onPress, last }: { icon: IconComponent; tone: Tone; label: string; value: string | null; onPress?: () => void; last?: boolean }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <>
      <View style={styles.detail}>
        <View style={[styles.detailIcon, { backgroundColor: colors[tone.bg] }]}>
          <Icon size={17} color={colors[tone.fg]} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.flex}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          <Text variant="body" tone={onPress ? "primary" : "default"} onPress={onPress} selectable numberOfLines={2}>
            {value}
          </Text>
        </View>
      </View>
      {!last ? <Divider inset={space.lg + 36 + space.md} /> : null}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <Skeleton width={92} height={92} round />
      <Skeleton width={180} height={22} />
      <Skeleton width={120} height={14} />
    </View>
  );
}

/** Room under the content for the pinned action bar. */
const BAR_SPACE = 104;

const styles = StyleSheet.create({
  profile: { alignItems: "center", gap: space.xs + 2, paddingTop: space.sm, paddingBottom: space.xl, paddingHorizontal: gutter },
  avatarLift: { borderRadius: 46, marginBottom: space.sm },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, flexWrap: "wrap" },
  name: { letterSpacing: -0.4 },
  stats: { flexDirection: "row", gap: space.sm + 2, paddingHorizontal: gutter, marginBottom: space.md },
  stat: { flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.md, paddingHorizontal: space.md + 2, gap: 2 },
  card: { marginHorizontal: gutter },
  tabs: { flexDirection: "row", gap: space.xl, paddingHorizontal: gutter, marginTop: space.xxl, marginBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { paddingBottom: space.sm + 2, borderBottomWidth: 2.5, marginBottom: -StyleSheet.hairlineWidth },
  block: { paddingHorizontal: gutter, gap: space.md },
  tabList: { gap: space.md },
  taskList: { marginHorizontal: -gutter },
  emptyTab: { gap: space.md, alignItems: "flex-start" },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  detail: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  detailIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  noteBox: { gap: space.sm },
  noteInput: { minHeight: 44 },
  noteSave: { alignSelf: "flex-end" },
  errorPad: { paddingTop: space.xxl },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: space.sm + 2, paddingHorizontal: gutter, paddingTop: space.xxl },
  mainAction: { flex: 1, height: 56, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
