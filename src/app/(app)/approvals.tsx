import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { mergeApprovals, type ApprovalItem } from "@/features/approvals/approvals";
import { ActionRow, DraftRow } from "@/features/approvals/ApprovalRows";
import { useAgentActions, useDecideAction, useDraftsVisible, useDrafts } from "@/features/approvals/useApprovals";
import { getIntlLocale, t } from "@/i18n";
import { openApproval } from "@/lib/navigate";
import { useOnline } from "@/query/useOnline";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { FilterChips } from "@/ui/Chip";
import { ListReveal } from "@/ui/ListReveal";
import { ShieldCheck } from "@/ui/icons";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

type Filter = "all" | "drafts" | "actions";

/** Everything the AI is waiting on you for: reply drafts to read and approve, and agent actions to OK. */
export default function ApprovalsScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const draftsOn = useDraftsVisible();
  const canDecideDrafts = useCan("ai_drafts_decide");
  const drafts = useDrafts(draftsOn);
  const actions = useAgentActions();
  const decide = useDecideAction();
  const [filter, setFilter] = useState<Filter>("all");

  const draftList = draftsOn ? drafts.data : undefined;
  const items = useMemo(
    () => mergeApprovals(filter === "actions" ? undefined : draftList, filter === "drafts" ? undefined : actions.data),
    [draftList, actions.data, filter]
  );
  // Agent actions never fail the screen alone: a locked or missing AI SDR still shows them (and vice versa).
  const pending = (draftsOn && drafts.isPending) || actions.isPending;
  const failed = (!draftsOn || drafts.isError) && actions.isError;
  const refetch = () => {
    if (draftsOn) void drafts.refetch();
    void actions.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: t("approvals.title") }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!online ? <OfflineBanner /> : null}
        <FlashList<ApprovalItem>
          data={items}
          keyExtractor={(i) => i.key}
          getItemType={(i) => i.kind}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={refetch}
          refreshing={drafts.isRefetching || actions.isRefetching}
          ListHeaderComponent={
            draftsOn ? (
              <View style={styles.filters}>
                <FilterChips<Filter>
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { key: "all", label: t("approvals.all") },
                    { key: "drafts", label: t("approvals.drafts"), count: draftList?.length },
                    { key: "actions", label: t("approvals.actions"), count: actions.data?.length },
                  ]}
                />
                {canDecideDrafts ? null : (
                  <Text variant="footnote" tone="muted" style={styles.hint}>
                    {t("approvals.viewOnly")}
                  </Text>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            pending ? (
              <DelayedFallback>
                <SkeletonList rows={5} />
              </DelayedFallback>
            ) : failed ? (
              <ErrorState offline={!online} message={online ? userMessage(actions.error) : undefined} onRetry={refetch} />
            ) : (
              <EmptyState icon={ShieldCheck} title={t("approvals.emptyTitle")} message={t("approvals.emptyMessage")} />
            )
          }
          ListFooterComponent={<View style={styles.footer} />}
          renderItem={({ item, index }) => (
            <ListReveal index={index}>
              {item.kind === "draft" ? (
                <DraftRow draft={item.draft} locale={locale} onOpen={(d) => openApproval(d.id)} />
              ) : (
                <ActionRow
                  action={item.action}
                  locale={locale}
                  canDecide
                  busy={decide.isPending && decide.variables?.action.id === item.action.id}
                  onDecide={(action, kind) => decide.mutate({ action, kind })}
                />
              )}
            </ListReveal>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  filters: { paddingTop: space.xs, paddingBottom: space.sm, gap: space.sm },
  hint: { paddingHorizontal: gutter },
  footer: { height: 48 },
});
