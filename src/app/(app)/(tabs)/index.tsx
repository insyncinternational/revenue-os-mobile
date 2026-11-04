import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { userMessage } from "@/api/errors";
import { Conversations, Focus, Suggestions } from "@/features/today/Panels";
import { Funnel } from "@/features/today/Funnel";
import { GetStarted } from "@/features/today/GetStarted";
import { Hero } from "@/features/today/Hero";
import { Kpis } from "@/features/today/Kpis";
import { Glance } from "@/features/today/Glance";
import { PushPrompt } from "@/features/today/PushPrompt";
import { QuickActions, useQuickActions } from "@/features/today/QuickActions";
import { TodaySkeleton } from "@/features/today/TodaySkeleton";
import { UpNext } from "@/features/today/UpNext";
import { useCompleteTask, useToday, type Period } from "@/features/today/useToday";
import { t } from "@/i18n";
import { go, openApprovals, openDealForm } from "@/lib/navigate";
import { appLinkFor } from "@/lib/links";
import { useOnline } from "@/query/useOnline";
import { gutter, space } from "@/theme/tokens";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { DelayedFallback } from "@/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/ui/States";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { useApprovalCount } from "@/features/approvals/useApprovals";
import { funnelSteps, isFreshWorkspace, orderMetrics, performanceMetrics, topStats } from "@/features/today/charts";
import { HERO_ITEMS, NextUpCarousel } from "@/features/today/NextUp";
import { Stats } from "@/features/today/Stats";
import { Button } from "@/ui/Button";
import { freshSuggestions, todayHeadline } from "@/features/today/headline";
import { useWorkspaceAccess } from "@/session/workspace";
import { useTodayWidgetSync } from "@/widgets/widgetSync";

/** Today: what needs you now, today's meetings, and how the period is going — one screen, one request. */
export default function Today() {
  const online = useOnline();
  const { period, setPeriod, home, plan } = useToday();
  const complete = useCompleteTask();
  const approvals = useApprovalCount();
  const [showAllKpis, setShowAllKpis] = useState(false);
  const quick = useQuickActions();
  const data = home.data;
  const access = useWorkspaceAccess().data;
  // The home-screen widget shows what this screen loaded (no request of its own).
  useTodayWidgetSync({
    ready: Boolean(data),
    loadedAt: home.dataUpdatedAt,
    workspace: access?.client?.name ?? access?.workspace.name ?? null,
    counters: data?.my_day?.counters ?? null,
    next: plan.data?.items[0]?.title ?? null,
  });

  const scrim = useStatusBarScrim();

  const refresh = () => {
    void home.refetch();
    void plan.refetch();
  };

  if (!data && home.isPending) {
    return (
      <Screen contentInsetAdjustmentBehavior="never">
        <DelayedFallback>
          <TodaySkeleton />
        </DelayedFallback>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen contentInsetAdjustmentBehavior="never" onRefresh={refresh} refreshing={home.isRefetching}>
        <Hero counters={null} headline={null} />
        <ErrorState offline={!online} message={online ? userMessage(home.error) : undefined} onRetry={refresh} />
      </Screen>
    );
  }

  const counters = data.my_day?.counters ?? null;
  // Written by the app from the counters (translated, and only suggesting what the phone can do).
  const line = counters ? todayHeadline(counters, approvals) : null;
  // "All clear" is said by the caught-up card below; the hero then shows the date instead of saying it twice.
  const headline = line ? (line.key === "today.headlineClear" ? null : t(line.key, line.vars)) : (plan.data?.headline ?? null);
  const items = plan.data?.items ?? [];
  const meetings = data.meetings ?? [];
  const kpis = data.kpis?.metrics ?? [];
  const openDeals = data.pipeline?.bars.reduce((n, b) => n + b.count, 0) ?? 0;
  // Nothing in the workspace yet: first steps instead of Performance, Pipeline and the funnel (all zeros).
  const fresh = isFreshWorkspace(kpis, openDeals, data.conversations?.length ?? 0);
  const funnel = fresh ? null : funnelSteps(kpis);
  // Each number in one place: counts the funnel shows don't get a tile as well.
  const metrics = orderMetrics(performanceMetrics(kpis, funnel), funnel ? 2 : 5);
  const stats = topStats(kpis);
  const canAddDeal = quick.some((a) => a.key === "deal");
  const suggestions = freshSuggestions(data.recommendations ?? [], items);
  // What to do comes first: the plan, then suggestions; "all caught up" only when there is neither.
  const caughtUp = items.length === 0 && suggestions.length === 0;
  // The hero pages through the first few plan items (or shows the top suggestion when there's no plan).
  const heroItem = items[0];
  const heroSuggestion = heroItem ? undefined : suggestions[0];
  const restItems = items.slice(HERO_ITEMS);
  const restSuggestions = heroItem ? suggestions : suggestions.slice(1);
  const onComplete = (taskId: number, itemId: string) => complete.mutate({ taskId, itemId });
  let section = 0;

  return (
    // No navigation header: the hero is the header, so the safe area is applied inside it (once).
    <View style={styles.fill}>
      <Screen
        contentInsetAdjustmentBehavior="never"
        onRefresh={refresh}
        refreshing={home.isRefetching || plan.isRefetching}
        onScroll={scrim.onScroll}
        scrollEventThrottle={16}
      >
        <Hero
          counters={counters}
          headline={headline}
          approvals={approvals}
          onApprovals={openApprovals}
          onCounter={(key) => {
            const link = appLinkFor(counters?.find((c) => c.key === key)?.href);
            if (link) go(link);
          }}
        />
        {!online ? <OfflineBanner /> : null}

        <View style={styles.upNext}>
          {caughtUp ? (
            <Reveal index={section++}>
              <UpNext items={[]} onComplete={onComplete} />
            </Reveal>
          ) : (
            // The first thing to do is the hero; the rest of the plan and the other suggestions follow it.
            <Reveal index={section++}>
              <NextUpCarousel items={items} suggestion={heroSuggestion} onComplete={onComplete} />
            </Reveal>
          )}
          {/* At a glance, as in the mock: open pipeline, won this period, the next meeting. */}
          {!fresh ? (
            <Reveal index={section++}>
              <Glance pipeline={data.pipeline} won={kpis.find((k) => k.key === "won") ?? null} sinceDays={data.kpis?.since_days ?? period} currency={data.kpis?.currency ?? data.pipeline?.currency ?? "USD"} meetings={meetings} />
            </Reveal>
          ) : null}
          {restItems.length > 0 ? (
            <Reveal index={section++}>
              <UpNext items={restItems} onComplete={onComplete} />
            </Reveal>
          ) : null}
          {restSuggestions.length > 0 ? (
            <Reveal index={section++}>
              <Suggestions items={restSuggestions} />
            </Reveal>
          ) : null}
          {fresh ? (
            <Reveal index={section++}>
              <GetStarted />
            </Reveal>
          ) : null}
          {data.focus_prospect ? (
            <Reveal index={section++}>
              <Focus prospect={data.focus_prospect} />
            </Reveal>
          ) : null}
          <Reveal index={section++}>
            <PushPrompt />
          </Reveal>
        </View>

        {kpis.length > 0 && !fresh ? (
          <Reveal index={section++}>
            {/* The period switch sits beside the title: it changes this section and the pipeline below. */}
            <SectionHeader
              title={t("today.performance")}
              right={
                <SegmentedControl<`${Period}`>
                  size="sm"
                  value={`${period}`}
                  onChange={(v) => setPeriod(Number(v) as Period)}
                  options={[
                    { key: "7", label: t("today.last7") },
                    { key: "30", label: t("today.last30") },
                    { key: "90", label: t("today.last90") },
                  ]}
                />
              }
            />
            <View style={styles.block}>
              {/* At a glance: the three numbers that moved. "See all" opens every number and the funnel. */}
              {stats.length > 0 && !showAllKpis ? (
                <Stats metrics={kpis} currency={data.kpis?.currency ?? "USD"} />
              ) : (
                <Kpis
                  metrics={showAllKpis ? [...metrics.shown, ...metrics.rest] : metrics.shown}
                  currency={data.kpis?.currency ?? "USD"}
                  onAddDeal={canAddDeal ? () => openDealForm() : undefined}
                />
              )}
              {showAllKpis && funnel ? <Funnel steps={funnel} metrics={kpis} /> : null}
              {stats.length > 0 || metrics.rest.length ? (
                <Button
                  label={showAllKpis ? t("today.showLess") : t("today.seeAllCount", { count: kpis.length })}
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowAllKpis((v) => !v)}
                />
              ) : null}
            </View>
          </Reveal>
        ) : null}

        {data.conversations && data.conversations.length > 0 ? (
          <Reveal index={section++}>
            <SectionHeader title={t("today.conversations")} action={t("common.seeAll")} onAction={() => go("/inbox")} />
            <View style={styles.block}>
              <Conversations rows={data.conversations} />
            </View>
          </Reveal>
        ) : null}

        {/* Quick add, last: the header-free way to start something new. */}
        {!fresh && quick.length > 0 ? (
          <Reveal index={section++}>
            <View style={styles.quick}>
              <QuickActions actions={quick} />
            </View>
          </Reveal>
        ) : null}
      </Screen>
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  upNext: { paddingHorizontal: gutter, gap: space.md },
  block: { paddingHorizontal: gutter, gap: space.md },
  quick: { paddingHorizontal: gutter, paddingTop: space.xxl },
});
