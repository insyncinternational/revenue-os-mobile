import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { DealCard } from "@/features/pipeline/DealCard";
import { FeaturedDealCard } from "@/features/pipeline/FeaturedDealCard";
import { nextStage, orderedStages } from "@/features/pipeline/pipeline";
import { StageTabs } from "@/features/pipeline/StageTabs";
import { PipelineSummary } from "@/features/pipeline/PipelineSummary";
import { useMoveDeal, usePipelineBoard } from "@/features/pipeline/usePipeline";
import { getIntlLocale, t } from "@/i18n";
import { money } from "@/lib/format";
import { openDeal, openDealForm, openMoveDeal, openPipelinePicker } from "@/lib/navigate";
import { useOnline } from "@/query/useOnline";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import type { Deal } from "@/types/pipeline";
import { useHeaderChip } from "@/ui/headerChip";
import { ArrowLeftRight, ChevronDown, ChevronRight, ICON_STROKE, KanbanSquare, Lock, Trophy } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { PullRefresh } from "@/ui/PullRefresh";
import { DelayedFallback, SkeletonPipeline } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { SwipeableRow } from "@/ui/SwipeableRow";
import { Text } from "@/ui/Text";
import { ListReveal } from "@/ui/ListReveal";
import { TabHeader } from "@/ui/TabHeader";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { useRefreshOffset } from "@/ui/Screen";

export default function PipelineScreen() {
  const enabled = useModuleEnabled("crm");
  if (!enabled) return <EmptyState area="pipeline" icon={Lock} title={t("state.notAllowedTitle")} message={t("pipeline.notAvailable")} />;
  return <PipelineBoard />;
}

function PipelineBoard() {
  const refreshOffset = useRefreshOffset();
  const { colors } = useTheme();
  const scrim = useStatusBarScrim();
  const chip = useHeaderChip();
  const online = useOnline();
  const locale = getIntlLocale();
  const canEdit = useCan("deals_edit");
  const canCreate = useCan("contacts_create");
  const seeMoney = useCan("deals_money");
  const { board, bootstrap, pipelines, pipelineId } = usePipelineBoard();
  const move = useMoveDeal();
  const [picked, setPicked] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  const stages = useMemo(() => orderedStages(board.data?.stages ?? []), [board.data?.stages]);
  const totals = board.data?.stage_totals ?? {};
  // Default to the first stage that has deals, so the screen never opens on an empty column.
  const selected = picked && stages.some((s) => s.id === picked) ? picked : (stages.find((s) => !s.is_won && !s.is_lost && (totals[String(s.id)]?.count ?? 0) > 0) ?? stages[0])?.id ?? null;
  const stage = stages.find((s) => s.id === selected);
  const deals = selected != null ? (board.data?.dealsByStage[String(selected)] ?? []) : [];
  // The board loads the newest deals of each stage (the server caps it); say so when a stage has more.
  const stageTotal = selected != null ? (totals[String(selected)]?.count ?? 0) : 0;
  const currency = bootstrap.data?.settings.default_currency ?? "USD";
  const wonStage = stages.find((s) => s.is_won);
  const closedStages = stages.filter((s) => s.is_won || s.is_lost);

  const open = stages.filter((s) => !s.is_won && !s.is_lost);
  const openValue = open.reduce((n, s) => n + (totals[String(s.id)]?.value ?? 0), 0);
  const weighted = open.reduce((n, s) => n + (totals[String(s.id)]?.weighted_value ?? 0), 0);
  const openCount = open.reduce((n, s) => n + (totals[String(s.id)]?.count ?? 0), 0);
  // Weighted as a share of the open value (0–100).
  const likely = openValue > 0 ? Math.round((weighted / openValue) * 100) : 0;

  const onPress = useCallback((d: Deal) => openDeal(d.id), []);

  const pipelineList = pipelines.data?.pipelines ?? [];
  const currentPipeline = pipelineList.find((p) => p.id === pipelineId);
  const switchPipeline = () => {
    if (pipelineList.length < 2) return;
    openPipelinePicker();
  };

  if (!board.data) {
    return board.isPending ? (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <DelayedFallback>
          <SkeletonPipeline />
        </DelayedFallback>
      </View>
    ) : (
      <ErrorState offline={!online} message={online ? userMessage(board.error) : undefined} onRetry={() => void board.refetch()} />
    );
  }

  const header = (
    <View style={styles.header}>
      <TabHeader
        area="pipeline"
        title={t("tabs.pipeline")}
        summary={openCount === 1 ? t("pipeline.dealCountOne") : t("pipeline.dealCount", { count: openCount })}
        action={canCreate ? { label: t("pipeline.add"), onPress: () => openDealForm({ stageId: stage && !stage.is_won && !stage.is_lost ? stage.id : undefined }) } : undefined}
      >
        {pipelineList.length > 1 && currentPipeline ? (
          <PressableScale
            onPress={switchPipeline}
            accessibilityRole="button"
            accessibilityLabel={`${currentPipeline.name}. ${t("pipeline.switchPipeline")}`}
            // 32 px tall to look like the other pills; 44 px to tap.
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.pipelinePill, chip]}>
            <Text variant="subhead" weight="semibold" numberOfLines={1} style={{ color: colors.text }}>
              {currentPipeline.name}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} strokeWidth={ICON_STROKE} />
          </PressableScale>
        ) : null}
      </TabHeader>
      {seeMoney && openCount > 0 ? (
        <PipelineSummary
          stages={open}
          totals={totals}
          openValue={openValue}
          weighted={weighted}
          likely={likely}
          selected={selected}
          onSelect={setPicked}
          money={(n) => money(n, currency, locale, { compact: n >= 1_000_000 })}
          compact={(n) => money(n, currency, locale, { compact: true })}
        />
      ) : null}
      {seeMoney && openCount > 0 ? (
        // The chart picks the open stage; its name and a hint head the list (the mock).
        <View style={styles.stageHead}>
          <Text variant="title" numberOfLines={1} style={styles.flexShrink}>
            {stage?.name ?? ""}
          </Text>
          <Text variant="eyebrow" tone="muted" numberOfLines={1}>
            {stageTotal === 1 ? t("pipeline.stageHintOne") : t("pipeline.stageHint", { count: stageTotal })}
          </Text>
        </View>
      ) : (
        <StageTabs stages={stages} totals={totals} selected={selected} onSelect={setPicked} money={seeMoney ? (n) => money(n, currency, locale, { compact: true }) : undefined} />
      )}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={deals}
        keyExtractor={(d) => String(d.id)}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<PullRefresh busy={board.isRefetching} onRefresh={() => void board.refetch()} progressViewOffset={refreshOffset} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          openCount === 0 && (totals[String(selected)]?.count ?? 0) === 0 && !stages.some((s) => (totals[String(s.id)]?.count ?? 0) > 0) ? (
            <EmptyState area="pipeline"
              icon={KanbanSquare}
              title={t("pipeline.emptyBoardTitle")}
              message={t("pipeline.emptyBoardMessage")}
              actionLabel={canCreate ? t("pipeline.add") : undefined}
              onAction={canCreate ? () => openDealForm() : undefined}
            />
          ) : (
            <EmptyState area="pipeline" icon={KanbanSquare} title={t("pipeline.empty")} message={t("pipeline.emptyMessage")} />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {seeMoney && openCount > 0 && closedStages.length > 0 ? (
              <View style={styles.closed}>
                <Text variant="eyebrow" tone="muted" style={styles.closedLabel}>
                  {t("pipeline.closed")}
                </Text>
                <StageTabs stages={closedStages} totals={totals} selected={selected} onSelect={setPicked} money={(n) => money(n, currency, locale, { compact: true })} />
              </View>
            ) : null}
            {deals.length > 0 && stageTotal > deals.length ? (
              <Text variant="footnote" tone="muted" align="center" numeric>
                {t("pipeline.showingOf", { shown: deals.length, total: stageTotal })}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const next = nextStage(stages, item.stage_id);
          // Inside the swipe row (never around it), so the swipe area isn't moved while it slides in.
          const card = (
            <ListReveal index={index}>
              {index === 0 && item.status === "open" ? (
                <FeaturedDealCard deal={item} locale={locale} showMoney={seeMoney} onPress={onPress} fallbackCurrency={currency} />
              ) : (
                <DealCard deal={item} stage={stage} locale={locale} now={now} showMoney={seeMoney} onPress={onPress} fallbackCurrency={currency} />
              )}
            </ListReveal>
          );
          if (!canEdit || item.status !== "open") return card;
          return (
            <SwipeableRow
              id={item.id}
              left={next ? { label: t("pipeline.advance"), icon: ChevronRight, color: colors.primaryFill, onTrigger: () => move.mutate({ deal: item, to: next }), removes: true } : { label: t("pipeline.move"), icon: ArrowLeftRight, color: colors.primaryFill, onTrigger: () => openMoveDeal(item.id) }}
              right={wonStage ? { label: t("pipeline.won"), icon: Trophy, color: colors.success, onTrigger: () => move.mutate({ deal: item, to: wonStage }), removes: true } : undefined}
            >
              {/* Opaque row: the swipe actions must not show through the card's side margins. */}
              <View style={{ backgroundColor: colors.background }}>{card}</View>
            </SwipeableRow>
          );
        }}
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: space.md, paddingBottom: space.md },
  pad: { marginHorizontal: gutter },
  pipelinePill: { flexDirection: "row", alignItems: "center", gap: space.xs, height: 32, paddingHorizontal: space.md, borderRadius: 999, borderWidth: 1, flexShrink: 1 },
  footer: { minHeight: 96, paddingTop: space.lg, paddingHorizontal: gutter, gap: space.md },
  stageHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, paddingHorizontal: gutter, paddingTop: space.md },
  flexShrink: { flexShrink: 1 },
  closed: { gap: space.sm, marginHorizontal: -gutter, paddingTop: space.md },
  closedLabel: { paddingHorizontal: gutter },
});
