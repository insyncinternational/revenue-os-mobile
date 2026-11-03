import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
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
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { GradientFill } from "@/ui/Gradient";
import { ArrowLeftRight, CalendarClock, ChevronRight, ICON_STROKE, Pencil, Percent, Trophy, UserRound, XCircle, type IconComponent } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { Input } from "@/ui/Input";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Ring } from "@/ui/Ring";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { DelayedFallback, Skeleton, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

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
  const dealStage = stages.find((s) => s.id === d?.stage_id);

  return (
    <>
      <Stack.Screen options={{ title: "", headerRight: () => (d && canEdit ? <IconButton icon={Pencil} label={t("pipeline.edit")} circle size={19} onPress={() => openDealForm({ id })} /> : null) }} />
      <Screen onRefresh={() => void Promise.all([deal.refetch(), timeline.refetch(), tasks.refetch()])} refreshing={deal.isRefetching}>
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
              {/* Washed in the stage's own colour (green when won), so each stage feels different. */}
              <GradientFill from={d.status === "won" ? colors.successSurface : colors.primarySubtle} to={colors.background} vertical glow={d.status === "won" ? colors.success : (dealStage?.color ?? colors.primary)} glowOpacity={0.22} />
              <Text variant="title" numberOfLines={3} accessibilityRole="header">
                {d.name}
              </Text>
              {seeMoney && d.amount != null ? (
                <View style={styles.amountRow}>
                  <AnimatedNumber value={d.amount} format={(n) => money(n, d.currency ?? "USD", locale)} variant="largeTitle" numberOfLines={1} adjustsFontSizeToFit style={[styles.flex, { color: d.status === "won" ? colors.success : colors.text }]} />
                  {d.status === "open" && d.probability != null ? (
                    <View style={styles.probability} accessible accessibilityLabel={`${t("pipeline.probability")}: ${d.probability}%`}>
                      <Ring value={d.probability / 100} size={52} stroke={5} color={dealStage?.color ?? colors.primary} track={colors.surfaceTertiary}>
                        <Text variant="caption" weight="semibold" numeric>{`${d.probability}%`}</Text>
                      </Ring>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <StageStrip stages={stages.filter((s) => !d.pipeline_id || s.pipeline_id === d.pipeline_id)} deal={d} />
              {d.status === "lost" && d.lost_reason ? <Badge label={`${t("pipeline.lostReason")}: ${lostReasonLabel(d.lost_reason)}`} tone="danger" /> : null}
              {canEdit ? (
                <View style={styles.actions}>
                  <Button label={t("pipeline.move")} icon={ArrowLeftRight} variant="secondary" onPress={() => openMoveDeal(id)} style={styles.flexBtn} />
                  {d.status === "open" && wonStage ? (
                    <Button label={t("pipeline.won")} icon={Trophy} onPress={() => move.mutate({ deal: d, to: wonStage })} style={styles.flexBtn} />
                  ) : null}
                  {d.status === "open" ? <IconButton icon={XCircle} label={t("pipeline.markLost")} tone="danger" filled onPress={() => openMoveDeal(id, { lost: true })} /> : null}
                </View>
              ) : null}
            </View>

            <Reveal index={0}>
              <SectionHeader title={t("contacts.details")} />
              <Card padded={false} style={styles.card}>
                {d.lead ? (
                  <PressableScale onPress={() => openContact(d.lead!.id)} accessibilityLabel={`${t("pipeline.contact")}: ${contactLabel}`} scaleTo={0.99} style={styles.row}>
                    <Avatar name={contactLabel || "?"} size={36} />
                    <View style={styles.flex}>
                      <Text variant="caption" tone="muted">
                        {t("pipeline.contact")}
                      </Text>
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
                ) : null}
                {(
                  [
                    { icon: CalendarClock, label: t("pipeline.closeDate"), value: Number.isFinite(close) ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(close)) : null, danger: d.status === "open" && close < now - 86_400_000 },
                    // Open deals show it as the ring at the top; the row is only for closed ones (no number twice).
                    { icon: Percent, label: t("pipeline.probability"), value: d.probability != null && d.status !== "open" ? `${d.probability}%` : null },
                    { icon: UserRound, label: t("pipeline.owner"), value: d.owner?.name || d.owner?.email || null },
                  ] as { icon: IconComponent; label: string; value: string | null; danger?: boolean }[]
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
                          <Text variant="body" tone={r.danger ? "danger" : "default"}>
                            {r.value}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </Card>
            </Reveal>

            {dealTasks.length > 0 || canAddTask ? (
              <Reveal index={1}>
                <SectionHeader title={t("contacts.tasks")} action={canAddTask ? t("contacts.addTask") : undefined} onAction={canAddTask ? () => openTaskForm({ dealId: id, leadId: d.lead_id ?? undefined }) : undefined} />
                {dealTasks.length > 0 ? (
                  dealTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      now={nowDate}
                      locale={locale}
                      canEdit={canEditTasks}
                      onToggle={(x) => toggleTask.mutate({ task: x, done: true })}
                      onOpen={(x) => openTaskForm({ id: x.id })}
                    />
                  ))
                ) : (
                  <Text variant="subhead" tone="muted" style={styles.hint}>
                    {t("pipeline.noTasks")}
                  </Text>
                )}
              </Reveal>
            ) : null}

            {seeInvoices && (dealInvoices.length > 0 || (canInvoice && d.status !== "lost")) ? (
              <Reveal index={2}>
                <SectionHeader
                  title={t("invoice.title")}
                  action={canInvoice && d.status !== "lost" ? t("invoice.create") : undefined}
                  onAction={
                    canInvoice && d.status !== "lost"
                      ? () =>
                          fromDeal.mutate(id, {
                            onSuccess: ({ invoice }) => {
                              toast.show(t("invoice.createdFromDeal"), { kind: "success" });
                              openInvoice(invoice.id);
                            },
                          })
                      : undefined
                  }
                />
                {dealInvoices.length > 0 ? (
                  dealInvoices.map((inv) => <InvoiceRow key={inv.id} invoice={inv} locale={locale} today={today} onOpen={(x) => openInvoice(x.id)} />)
                ) : (
                  <Text variant="subhead" tone="muted" style={styles.hint}>
                    {fromDeal.isPending ? t("invoice.creating") : t("pipeline.noInvoices")}
                  </Text>
                )}
              </Reveal>
            ) : null}

            <Reveal index={3}>
              <SectionHeader title={t("contacts.activity")} />
              <View style={styles.block}>
                {canNote ? (
                  <Card contentStyle={styles.noteBox}>
                    <Input value={note} onChangeText={setNote} placeholder={t("contacts.addNote")} multiline style={styles.noteInput} />
                    {note.trim() ? (
                      <Button label={t("contacts.saveNote")} size="sm" loading={addNote.isPending} onPress={() => addNote.mutate(note.trim(), { onSuccess: () => setNote("") })} style={styles.noteSave} />
                    ) : null}
                  </Card>
                ) : null}
                {timeline.isPending ? <SkeletonList rows={3} /> : <Timeline items={timeline.data?.timeline ?? []} locale={locale} />}
              </View>
            </Reveal>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.md, overflow: "hidden" },
  actions: { flexDirection: "row", gap: space.sm, alignItems: "center", marginTop: space.xs },
  flexBtn: { flex: 1, alignSelf: "auto" },
  amountRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  probability: { alignItems: "center" },
  card: { marginHorizontal: gutter },
  block: { paddingHorizontal: gutter, gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  noteBox: { gap: space.sm },
  noteInput: { minHeight: 44 },
  noteSave: { alignSelf: "flex-end" },
  hint: { paddingHorizontal: gutter },
});
