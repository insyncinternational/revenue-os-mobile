import { useState, type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { dial } from "@/features/contacts/callFollowUp";
import { dialable, fullName, headline, whatsappLink } from "@/features/contacts/contact";
import { tierTone, tierWord } from "@/features/contacts/tier";
import { Timeline } from "@/features/contacts/Timeline";
import { useAddNote, useContact } from "@/features/contacts/useContacts";
import { TaskRow } from "@/features/tasks/TaskRow";
import { useToggleTask } from "@/features/tasks/useTasks";
import { getIntlLocale, t } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { openContactForm, openDeal, openDealForm, openInvoiceForm, openMeeting, openMeetingForm, openTaskForm } from "@/lib/navigate";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { channelColors, gutter, radius, space, type Palette } from "@/theme/tokens";
import { useAreaHeaderStyle } from "@/ui/Backdrop";
import { Badge } from "@/ui/Badge";
import { ActionTiles, type TileAction } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Briefcase, Building, CalendarDays, CalendarPlus, ChevronRight, ICON_STROKE, KanbanSquare, ListTodo, Mail, MessageSquare, Pencil, Phone, Plus, Receipt, StickyNote, type IconComponent } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { Input } from "@/ui/Input";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { Divider } from "@/ui/Section";
import { DelayedFallback, Skeleton, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { UnderlineTabs } from "@/ui/UnderlineTabs";
import { Segments } from "@/ui/Meters";
import { accentGradient } from "@/ui/Gloss";
import { scoreTone } from "@/ui/scoreTone";
import { WhatsAppIcon } from "@/ui/BrandIcons";

type Tab = "activity" | "deals" | "meetings" | "tasks";

/**
 * Everything about one person on one screen: their name large, the ways to reach them as tiles, the score, the
 * details, then Activity / Deals / Meetings / Tasks as pill tabs.
 */
export default function ContactScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
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
  // Bumped by the Note tile: remounts the note box focused.
  const [noteFocus, setNoteFocus] = useState(0);
  const headerTint = useAreaHeaderStyle("contacts");
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
  // Beside the score: meetings when the workspace books them, else deals.
  const accentStat = tabs.find((x) => x.key === "meetings") ?? tabs.find((x) => x.key === "deals");
  const chipList = c ? [c.region, c.industry].filter((x): x is string => !!x && !!x.trim()) : [];
  const scoreWord = c?.score != null ? (c.tier ? tierWord(c.tier) : t(SCORE_WORD[scoreTone(c.score)])) : "";

  // Ways to reach them, best first: the first tile is ink, the rest white.
  const reach = (
    [
      phone && { key: "call", label: t("contacts.call"), icon: Phone, run: () => dial(phone, id, name) },
      c?.email && { key: "email", label: t("contacts.email"), icon: Mail, run: () => void Linking.openURL(`mailto:${c.email}`) },
      wa && { key: "whatsapp", label: t("contacts.whatsapp"), glyph: <WhatsAppIcon size={22} color={channelColors.whatsapp} />, run: () => void Linking.openURL(wa) },
      crm && canNote && { key: "note", label: t("contacts.note"), icon: StickyNote, run: () => { setTab("activity"); setNoteFocus((n) => n + 1); } },
      phone && { key: "text", label: t("contacts.text"), icon: MessageSquare, run: () => void Linking.openURL(`sms:${phone}`) },
      !phone && canEdit && { key: "phone", label: t("contacts.addPhone"), icon: Plus, run: () => openContactForm(id) },
      canInvoice && { key: "invoice", label: t("contacts.invoice"), icon: Receipt, run: () => openInvoiceForm({ leadId: id }) },
    ] as (TileAction | false | null | undefined | "")[]
  ).filter((r): r is TileAction => !!r);

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: headerTint,
          headerRight: () => (c && canEdit ? <IconButton icon={Pencil} label={t("contacts.edit")} circle size={19} onPress={() => openContactForm(id)} /> : null),
        }}
      />
      <Screen
        onRefresh={() => void Promise.all([contact.refetch(), timeline.refetch(), tasks.refetch(), deals.refetch()])}
        refreshing={contact.isRefetching}
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
            {/* Who they are: the name very large, their role, and where / what as small white pills. */}
            <View style={styles.profile}>
              <Text variant="largeTitle" numberOfLines={3} accessibilityRole="header" style={styles.name}>
                {name}
              </Text>
              {headline(c) ? (
                <Text variant="callout" tone="muted" numberOfLines={2}>
                  {headline(c)}
                </Text>
              ) : null}
              {chipList.length > 0 || (c.tier && c.score == null) ? (
                <View style={styles.chips}>
                  {chipList.map((x) => (
                    <View key={x} style={[styles.chip, { backgroundColor: colors.surface }]}>
                      <Text variant="footnote" numberOfLines={1}>
                        {x}
                      </Text>
                    </View>
                  ))}
                  {c.tier && c.score == null ? <Badge label={tierWord(c.tier)} tone={tierTone(c.tier) ?? "neutral"} /> : null}
                </View>
              ) : null}
            </View>

            {/* The ways to reach them, best first, as big tiles right under the name (nothing pinned at the bottom). */}
            <ActionTiles actions={reach} style={styles.tiles} />

            {/* The score (ten segments and a word) beside the meetings count in the accent; without a score, up to
                three counts that each open their tab. */}
            {c.score != null ? (
              <View style={styles.bento}>
                <View style={[styles.scoreTile, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${t("contacts.score")}: ${Math.round(c.score)}, ${scoreWord}`}>
                  <View style={styles.between}>
                    <Text variant="footnote" tone="muted">
                      {t("contacts.score")}
                    </Text>
                    <Text variant="footnote" tone="muted">
                      {scoreWord}
                    </Text>
                  </View>
                  <Text variant="metric" numeric>
                    {Math.round(c.score)}
                    <Text variant="subhead" tone="muted">
                      {" /100"}
                    </Text>
                  </Text>
                  <Segments value={c.score} on={colors.primaryFill} off={colors.surfaceTertiary} height={8} />
                </View>
                {accentStat ? (
                  <PressableScale
                    onPress={() => setTab(accentStat.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${accentStat.label}: ${accentStat.count ?? 0}`}
                    style={[styles.accentTile, { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) }]}
                  >
                    <Text variant="footnote" style={{ color: colors.onPrimaryMuted }} numberOfLines={1}>
                      {accentStat.label}
                    </Text>
                    <Text variant="metric" numeric style={{ color: colors.onPrimary }}>
                      {accentStat.count ?? 0}
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
            ) : stats.length > 0 ? (
              <View style={styles.stats}>
                {stats.map((x, i) => (
                  <PressableScale
                    key={x.key}
                    onPress={() => setTab(x.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${x.label}: ${x.count ?? 0}`}
                    style={[styles.stat, i === 0 ? { backgroundColor: colors.primaryFill, backgroundImage: accentGradient(colors) } : { backgroundColor: colors.surface }]}
                  >
                    <Text variant="metric" numeric numberOfLines={1} style={i === 0 ? { color: colors.onPrimary } : undefined}>
                      {x.count ?? 0}
                    </Text>
                    <Text variant="footnote" weight="medium" numberOfLines={1} style={{ color: i === 0 ? colors.onPrimaryMuted : colors.textMuted }}>
                      {x.label}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ) : null}

            <Reveal index={0}>
              <Card padded={false} style={styles.card}>
                {/* Only filled-in fields; dividers go between the rows actually shown. */}
                {(
                  [
                    { icon: Mail, tone: TONES.info, label: t("contacts.email"), value: c.email, onPress: c.email ? () => void Linking.openURL(`mailto:${c.email}`) : undefined },
                    { icon: Phone, tone: TONES.success, label: t("contacts.phone"), value: c.phone, onPress: phone ? () => dial(phone, id, name) : undefined },
                    { icon: Building, tone: TONES.warning, label: t("contacts.company"), value: c.company },
                    { icon: Briefcase, tone: TONES.primary, label: t("contacts.role"), value: c.role },
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
              <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />

              <View style={styles.block}>
                {tab === "activity" ? (
                  <>
                    {crm && canNote ? (
                      <Card contentStyle={styles.noteBox}>
                        <Input key={noteFocus} autoFocus={noteFocus > 0} value={note} onChangeText={setNote} placeholder={t("contacts.addNote")} multiline style={styles.noteInput} />
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
                              <View style={[styles.detailIcon, { backgroundColor: colors.surfaceTertiary }]}>
                                <CalendarDays size={17} color={colors.text} strokeWidth={ICON_STROKE} />
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

/** How warm a lead is, in one word, by the same thresholds as the score's colour. */
const SCORE_WORD = { danger: "contacts.cold", warning: "contacts.warm", success: "contacts.hot" } as const;


type Tone = { bg: keyof Palette; fg: keyof Palette };
// Mono look: every detail icon on the same calm grey.
const NEUTRAL: Tone = { bg: "primarySubtle", fg: "primary" };
const TONES = {
  info: NEUTRAL,
  success: NEUTRAL,
  warning: NEUTRAL,
  primary: NEUTRAL,
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
      <Skeleton width={220} height={40} />
      <Skeleton width={160} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { gap: space.xs + 2, paddingTop: space.md, paddingBottom: space.xl, paddingHorizontal: gutter },
  name: { fontSize: 40, lineHeight: 44 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs + 2, marginTop: space.sm },
  chip: { height: 30, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: "center", maxWidth: "100%" },
  tiles: { marginBottom: space.sm },
  bento: { flexDirection: "row", gap: space.sm, paddingHorizontal: gutter, marginBottom: space.md },
  scoreTile: { flex: 2, borderRadius: radius.xl, padding: space.lg, gap: space.xs },
  accentTile: { flex: 1, borderRadius: radius.xl, padding: space.lg, gap: space.xs },
  between: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  stats: { flexDirection: "row", gap: space.sm, paddingHorizontal: gutter, marginBottom: space.md },
  stat: { flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.md + 2, paddingHorizontal: space.lg, gap: 2 },
  card: { marginHorizontal: gutter },
  tabs: { marginTop: space.xl, marginBottom: space.md },
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
});
