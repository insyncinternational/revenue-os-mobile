import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { TASKS_LIMIT } from "@/api/tasks";
import { userMessage } from "@/api/errors";
import { TaskRow } from "@/features/tasks/TaskRow";
import { groupDone, groupTasks, todayProgress, type TaskItem } from "@/features/tasks/tasks";
import { useTaskList, useToggleTask, type TaskFilter } from "@/features/tasks/useTasks";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { openTaskForm } from "@/lib/navigate";
import { useOnline } from "@/query/useOnline";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import type { CrmTask } from "@/types/contact";
import { Card } from "@/ui/Card";
import { FilterChips } from "@/ui/Chip";
import { HeaderAction } from "@/ui/HeaderAction";
import { CheckCheck, ListTodo } from "@/ui/icons";
import { Ring } from "@/ui/Ring";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

/** My open tasks by when they're due (overdue first), everyone's, or what's been done. */
export default function TasksScreen() {
  const headerTint = useAreaHeaderStyle("tasks");
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const canCreate = useCan("tasks_create");
  const canEdit = useCan("tasks_edit");
  const [filter, setFilter] = useState<TaskFilter>("mine");
  const [now, setNow] = useState(() => new Date());
  const list = useTaskList(filter);
  const mine = useTaskList("mine", filter !== "mine");
  // What I finished (for today's ring); shared with the Done filter's list.
  const doneList = useTaskList("done", filter === "mine");
  const toggle = useToggleTask();

  const tasks = list.data?.tasks;
  const items = useMemo(() => (tasks ? (filter === "done" ? groupDone(tasks) : groupTasks(tasks, now)) : []), [tasks, filter, now]);
  const mineCount = (filter === "mine" ? list.data?.total : mine.data?.total) ?? 0;
  const progress = filter === "mine" && tasks ? todayProgress(tasks, doneList.data?.tasks ?? [], now) : null;
  const overdue = filter === "mine" ? items.find((i) => i.type === "header" && i.bucket === "overdue") : undefined;

  const onToggle = (task: CrmTask) => toggle.mutate({ task, done: task.status !== "completed" });
  const header = (item: Extract<TaskItem, { type: "header" }>) => t(`tasks.${item.bucket}` as TranslationKey);

  return (
    <>
      <Stack.Screen options={{ headerStyle: headerTint, title: t("tasks.title"), headerRight: () => (canCreate ? <HeaderAction size={40} label={t("tasks.new")} onPress={() => openTaskForm()} /> : null) }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList
          data={items}
          keyExtractor={(i) => i.key}
          getItemType={(i) => i.type}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={() => {
            setNow(new Date());
            void list.refetch();
          }}
          refreshing={list.isRefetching}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Backdrop area="tasks" underBar />
              {/* Today at a glance: a ring that fills as you tick things off. */}
              {progress && progress.total > 0 ? (
                <Card style={styles.progress} contentStyle={styles.progressBody}>
                  <Ring value={progress.done / progress.total} size={64} stroke={7} color={colors.success} track={colors.surfaceTertiary}>
                    <Text variant="callout" weight="semibold" numeric>{`${Math.round((progress.done / progress.total) * 100)}%`}</Text>
                  </Ring>
                  <View style={styles.flex}>
                    <Text variant="headline">{t("tasks.doneToday", { 0: progress.done, 1: progress.total })}</Text>
                    {overdue && overdue.type === "header" ? (
                      <Text variant="footnote" tone="danger">
                        {t("tasks.overdueSummary", { count: overdue.count })}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              ) : null}
              <FilterChips<TaskFilter>
                value={filter}
                onChange={setFilter}
                options={[
                  { key: "mine", label: t("tasks.mine"), count: mineCount },
                  { key: "all", label: t("tasks.everyone") },
                  { key: "done", label: t("tasks.doneFilter") },
                ]}
              />
              {overdue && overdue.type === "header" && !(progress && progress.total > 0) ? (
                <Text variant="footnote" tone="danger" style={styles.summary}>
                  {t("tasks.overdueSummary", { count: overdue.count })}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            list.isPending ? (
              <DelayedFallback>
                <SkeletonList rows={6} />
              </DelayedFallback>
            ) : list.isError ? (
              <ErrorState offline={!online} message={online ? userMessage(list.error) : undefined} onRetry={() => void list.refetch()} />
            ) : (
              <EmptyState area="tasks"
                icon={filter === "done" ? ListTodo : CheckCheck}
                title={filter === "done" ? t("tasks.noneDone") : t("tasks.allClear")}
                message={filter === "done" ? t("tasks.noneDoneMessage") : t("tasks.allClearMessage")}
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {list.data?.has_more ? (
                <Text variant="footnote" tone="muted" align="center">
                  {t("tasks.showingFirst", { count: TASKS_LIMIT })}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) =>
            item.type === "header" ? (
              <View style={styles.header}>
                <Text variant="footnote" weight="semibold" tone={item.bucket === "overdue" ? "danger" : "muted"} accessibilityRole="header" style={styles.headerText}>
                  {header(item).toUpperCase()}
                </Text>
                <Text variant="footnote" tone="subtle" numeric>
                  {item.count}
                </Text>
              </View>
            ) : (
              <TaskRow task={item.task} now={now} locale={locale} canEdit={canEdit} onToggle={onToggle} onOpen={(task) => openTaskForm({ id: task.id })} />
            )
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  filters: { paddingTop: space.xs, paddingBottom: space.xs, gap: space.sm },
  summary: { paddingHorizontal: gutter },
  progress: { marginHorizontal: gutter, marginBottom: space.xs },
  progressBody: { flexDirection: "row", alignItems: "center", gap: space.lg },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: gutter + space.xs, paddingTop: space.lg, paddingBottom: space.sm },
  headerText: { letterSpacing: 0.4 },
  footer: { height: 96, paddingTop: space.md },
});
