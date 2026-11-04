import { useState, type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { dial } from "@/features/contacts/callFollowUp";
import { dialable } from "@/features/contacts/contact";
import { Timeline } from "@/features/contacts/Timeline";
import { TaskRow } from "@/features/tasks/TaskRow";
import { useToggleTask } from "@/features/tasks/useTasks";
import { InvoiceRow } from "@/features/invoices/InvoiceRow";
import { useDealInvoices, useInvoiceFromDeal } from "@/features/invoices/useInvoices";
import { lostReasonLabel } from "@/features/pipeline/labels";
import { orderedStages } from "@/features/pipeline/pipeline";
import { StageStrip } from "@/features/pipeline/StageStrip";
import { useAddDealNote, useDeal, useMoveDeal, usePipelineBoard } from "@/features/pipeline/usePipeline";
import { getIntlLocale, t } from "@/i18n";
import { money } from "@/lib/format";
import { openContact, openDealForm, openInvoice, openMoveDeal, openTaskForm } from "@/lib/navigate";
import { dayKey } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { AnimatedNumber } from "@/ui/AnimatedNumber";
import { Avatar } from "@/ui/Avatar";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import { Badge } from "@/ui/Badge";
import { ActionTiles, type TileAction as BarAction } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ArrowLeftRight, ChevronRight, ICON_STROKE, ListTodo, Mail, Pencil, Percent, Phone, Receipt, Trophy, UserRound, XCircle, type IconComponent } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { Input } from "@/ui/Input";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Ring } from "@/ui/Ring";
import { RowAction } from "@/ui/RowAction";
import { Screen } from "@/ui/Screen";
import { Divider } from "@/ui/Section";
import { DelayedFallback, Skeleton, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";
import { UnderlineTabs } from "@/ui/UnderlineTabs";

type Tab = "activity" | "tasks" | "invoices";

/**
 * One deal: the amount and how likely it is up top (stage and close date as chips, the stage stepper opens Move),
 * who it's with, then Activity / Tasks / Invoices as tabs, and the next steps pinned at the bottom.
 */
export default function DealScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const toast = useToast();
  const locale = getIntlLocale();
  const { deal, timeline, tasks } = useDeal(id);
  const { board, bootstrap } = usePipelineBoard();
  const move = useMoveDeal();
  const addNote = useAddDealNote(id);
  const canEdit = useCan("deals_edit");
  const canNote = useCan("contacts_create");
  const seeMoney = useCan("deals_money");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<Tab>("activity");
  const [now] = useState(() => Date.now());
  const [nowDate] = useState(() => new Date(now));
  const d = deal.data?.deal;
  const toggleTask = useToggleTask();
  const canAddTask = useCan("tasks_create");
  const canEditTasks = useCan("tasks_edit");
  const dealTasks = (tasks.data?.tasks ?? []).filter((x) => x.task_type !== "meeting");
  const seeInvoices = useCan("invoices_read");
  const canInvoice = useCan("invoices_edit");
  const invoices = useDealInvoices(id, seeInvoices);
  const fromDeal = useInvoiceFromDeal();
  const [today] = useState(() => dayKey(new Date()));
  const dealInvoices = invoices.data?.invoices ?? [];

  const stages = orderedStages(board.data?.stages ?? bootstrap.data?.stages ?? []);
  const wonStage = stages.find((s) => s.is_won && (!d?.pipeline_id || s.pipeline_id === d.pipeline_id));
  const contactLabel = d?.lead ? [d.lead.first_name, d.lead.last_name].filter(Boolean).join(" ").trim() || d.lead.email || "" : "";
  const close = d?.expected_close_date ? Date.parse(d.expected_close_date) : NaN;
  const closeOverdue = d?.status === "open" && close < now - 86_400_000;
  const dealStage = stages.find((s) => s.id === d?.stage_id);
  const phone = dialable(d?.lead?.phone);

  // Violet like the pipeline, green once won: the top bar and the wash under it are one colour fading down.
  const area = d?.status === "won" ? "won" : "pipeline";
  const headerStyle = useAreaHeaderStyle(area);

  const createInvoice = () =>
    fromDeal.mutate(id, {
      onSuccess: ({ invoice }) => {
        toast.show(t("invoice.createdFromDeal"), { kind: "success" });
        openInvoice(invoice.id);
      },
    });
  const canCreateInvoice = canInvoice && d?.status !== "lost";

  const tabs = (
    [
      { key: "activity", label: t("contacts.activity") },
      (dealTasks.length > 0 || canAddTask) && { key: "tasks", label: t("contacts.tasks") },
      seeInvoices && (dealInvoices.length > 0 || canCreateInvoice) && { key: "invoices", label: t("invoice.title") },
    ] as ({ key: Tab; label: string } | false)[]
  ).filter((x): x is { key: Tab; label: string } => Boolean(x));
  const shownTab = tabs.some((x) => x.key === tab) ? tab : "activity";

  // Next steps, a thumb away: Move as the main pill; Won (green), a new invoice and Lost (red) as round buttons.
  const bar: { main: BarAction; more: BarAction[] } | null =
    d && canEdit
      ? {
          main: { key: "move", label: t("pipeline.move"), icon: ArrowLeftRight, run: () => openMoveDeal(id) },
          more: (
            [
              d.status === "open" && wonStage && { key: "won", label: t("pipeline.markWon"), glyph: <Trophy size={21} color={colors.success} strokeWidth={ICON_STROKE + 0.25} />, run: () => move.mutate({ deal: d, to: wonStage }) },
              canCreateInvoice && { key: "invoice", label: t("invoice.create"), icon: Receipt, run: createInvoice },
              d.status === "open" && { key: "lost", label: t("pipeline.markLost"), glyph: <XCircle size={21} color={colors.danger} strokeWidth={ICON_STROKE + 0.25} />, run: () => openMoveDeal(id, { lost: true }) },
            ] as (BarAction | false | undefined)[]
          ).filter((x): x is BarAction => Boolean(x)),
        }
      : null;

  return (
    <>
      <Stack.Screen options={{ title: "", headerStyle, headerRight: () => (d && canEdit ? <IconButton icon={Pencil} label={t("pipeline.edit")} circle size={19} onPress={() => openDealForm({ id })} /> : null) }} />
      <Screen
        onRefresh={() => void Promise.all([deal.refetch(), timeline.refetch(), tasks.refetch()])}
        refreshing={deal.isRefetching}
      >
        {!d ? (
          deal.isPending ? (
            <DelayedFallback>
              <View style={styles.hero}>
                <Skeleton width={200} height={24} />
                <Skeleton width={140} height={36} />
              </View>
            </DelayedFallback>
          ) : (
            <ErrorState message={userMessage(deal.error)} onRetry={() => void deal.refetch()} />
          )
        ) : (
          <>
            <View style={styles.hero}>
              <Backdrop area={area} underBar />
              <Text variant="largeTitle" numberOfLines={3} accessibilityRole="header" style={styles.name}>
                {d.name}
              </Text>
              {seeMoney && d.amount != null ? (
                <View style={styles.amountRow}>
                  <AnimatedNumber value={d.amount} format={(n) => money(n, d.currency ?? "USD", locale)} variant="display" numberOfLines={1} adjustsFontSizeToFit style={[styles.flex, { color: d.status === "won" ? colors.success : colors.text }]} />
                  {d.status === "open" && d.probability != null ? (
                    <View style={styles.probability} accessible accessibilityLabel={`${t("pipeline.probability")}: ${d.probability}%`}>
                      <Ring value={d.probability / 100} size={56} stroke={5} color={colors.primaryFill} track={colors.surfaceTertiary}>
                        <Text variant="caption" weight="semibold" numeric>{`${d.probability}%`}</Text>
                      </Ring>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {/* Where it stands, as chips: the stage (or Won / Lost) and the close date. */}
              <View style={styles.chips}>
                {d.status === "won" ? (
                  <Badge label={t("pipeline.won")} tone="success" dot />
                ) : d.status === "lost" ? (
                  <Badge label={d.lost_reason ? `${t("pipeline.lost")} · ${lostReasonLabel(d.lost_reason)}` : t("pipeline.lost")} tone="danger" dot />
                ) : dealStage ? (
                  <View style={[styles.stageChip, { backgroundColor: colors.surface }]}>
                    <View style={[styles.stageDot, { backgroundColor: colors.primaryFill }]} />
                    <Text variant="caption" weight="semibold" numberOfLines={1}>
                      {dealStage.name}
                    </Text>
                  </View>
                ) : null}
                {Number.isFinite(close) ? (
                  <Badge label={closeOverdue ? t("pipeline.overdue") : t("pipeline.closes", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(close)) })} tone={closeOverdue ? "danger" : "neutral"} dot={closeOverdue} />
                ) : null}
              </View>
              {/* The stepper doubles as the way to move the deal. */}
              {canEdit && d.status === "open" ? (
                <PressableScale onPress={() => openMoveDeal(id)} accessibilityRole="button" accessibilityLabel={`${dealStage?.name ?? ""}. ${t("pipeline.move")}`} scaleTo={0.98}>
                  <StageStrip stages={stages.filter((s) => !d.pipeline_id || s.pipeline_id === d.pipeline_id)} deal={d} />
                </PressableScale>
              ) : (
                <StageStrip stages={stages.filter((s) => !d.pipeline_id || s.pipeline_id === d.pipeline_id)} deal={d} />
              )}
            </View>

            {/* Next steps as tiles in the page: Move first, then Won, a new invoice, Lost. */}
            {bar ? <ActionTiles actions={[bar.main, ...bar.more]} style={styles.tiles} /> : null}

            <Reveal index={0}>
              <Card padded={false} style={styles.card}>
                {d.lead ? (
                  // Who it's with, and one tap to reach them (call, else email) beside the row.
                  <View style={styles.contactRow}>
                    <PressableScale onPress={() => openContact(d.lead!.id)} accessibilityLabel={`${t("pipeline.contact")}: ${contactLabel}`} scaleTo={0.99} style={styles.contactMain}>
                      <Avatar name={contactLabel || "?"} size={40} />
                      <View style={styles.flex}>
                        <Text variant="callout" weight="semibold" numberOfLines={1}>
                          {contactLabel}
                        </Text>
                        {d.account?.name || d.lead.company ? (
                          <Text variant="footnote" tone="muted" numberOfLines={1}>
                            {d.account?.name ?? d.lead.company}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
                    </PressableScale>
                    {phone ? (
                      <RowAction icon={Phone} label={`${t("contacts.call")} ${contactLabel}`} tone="success" onPress={() => dial(phone, d.lead!.id, contactLabel)} />
                    ) : d.lead.email ? (
                      <RowAction icon={Mail} label={`${t("contacts.email")} ${contactLabel}`} tone="info" onPress={() => void Linking.openURL(`mailto:${d.lead!.email}`)} />
                    ) : null}
                  </View>
                ) : null}
                {(
                  [
                    // Open deals show it as the ring at the top; the row is only for closed ones (no number twice).
                    { icon: Percent, label: t("pipeline.probability"), value: d.probability != null && d.status !== "open" ? `${d.probability}%` : null },
                    { icon: UserRound, label: t("pipeline.owner"), value: d.owner?.name || d.owner?.email || null },
                  ] as { icon: IconComponent; label: string; value: string | null }[]
                )
                  .filter((r) => r.value)
                  .map((r, i) => (
                    <View key={r.label}>
                      {i > 0 || d.lead ? <Divider inset={space.lg + 36 + space.md} /> : null}
                      <View style={styles.row}>
                        <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
                          <r.icon size={16} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
                        </View>
                        <View style={styles.flex}>
                          <Text variant="caption" tone="muted">
                            {r.label}
                          </Text>
                          <Text variant="body">{r.value}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </Card>
            </Reveal>

            {/* One list at a time instead of three sections stacked under each other. */}
            <Reveal index={1}>
              {tabs.length > 1 ? <UnderlineTabs tabs={tabs} value={shownTab} onChange={setTab} style={styles.tabs} /> : null}
              <View style={[styles.block, tabs.length > 1 ? null : styles.blockTop]}>
                {shownTab === "activity" ? (
                  <>
                    {canNote ? (
                      <Card contentStyle={styles.noteBox}>
                        <Input value={note} onChangeText={setNote} placeholder={t("contacts.addNote")} multiline style={styles.noteInput} />
                        {note.trim() ? (
                          <Button label={t("contacts.saveNote")} size="sm" loading={addNote.isPending} onPress={() => addNote.mutate(note.trim(), { onSuccess: () => setNote("") })} style={styles.noteSave} />
                        ) : null}
                      </Card>
                    ) : null}
                    {timeline.isPending ? <SkeletonList rows={3} /> : <Timeline items={timeline.data?.timeline ?? []} locale={locale} />}
                  </>
                ) : null}

                {shownTab === "tasks" ? (
                  <TabList
                    empty={t("pipeline.noTasks")}
                    action={canAddTask ? { label: t("contacts.addTask"), icon: ListTodo, run: () => openTaskForm({ dealId: id, leadId: d.lead_id ?? undefined }) } : undefined}
                  >
                    {dealTasks.length > 0 ? (
                      <View style={styles.bleed}>
                        {dealTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            now={nowDate}
                            locale={locale}
                            canEdit={canEditTasks}
                            onToggle={(x) => toggleTask.mutate({ task: x, done: true })}
                            onOpen={(x) => openTaskForm({ id: x.id })}
                          />
                        ))}
                      </View>
                    ) : null}
                  </TabList>
                ) : null}

                {shownTab === "invoices" ? (
                  <TabList
                    empty={fromDeal.isPending ? t("invoice.creating") : t("pipeline.noInvoices")}
                    action={canCreateInvoice ? { label: t("invoice.create"), icon: Receipt, run: createInvoice } : undefined}
                  >
                    {dealInvoices.length > 0 ? (
                      <View style={styles.bleed}>
                        {dealInvoices.map((inv) => (
                          <InvoiceRow key={inv.id} invoice={inv} locale={locale} today={today} onOpen={(x) => openInvoice(x.id)} />
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
function TabList({ children, empty, action }: { children: ReactNode; empty: string; action?: { label: string; icon: IconComponent; run: () => void } }) {
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

const styles = StyleSheet.create({
  name: { fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  tiles: { marginTop: space.lg, marginBottom: space.xs },
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.md, overflow: "hidden" },
  amountRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  probability: { alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  stageChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radius.pill, maxWidth: 220 },
  stageDot: { width: 8, height: 8, borderRadius: 4 },
  card: { marginHorizontal: gutter },
  contactRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.lg },
  contactMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, paddingRight: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  tabs: { marginTop: space.xxl, marginBottom: space.md },
  block: { paddingHorizontal: gutter, gap: space.md },
  blockTop: { paddingTop: space.xxl },
  tabList: { gap: space.md },
  // Rows are full-width lists: out of the block's side padding.
  bleed: { marginHorizontal: -gutter },
  emptyTab: { gap: space.md, alignItems: "flex-start" },
  noteBox: { gap: space.sm },
  noteInput: { minHeight: 44 },
  noteSave: { alignSelf: "flex-end" },
});
