import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { userMessage } from "@/api/errors";
import { AgencyHeader } from "@/features/agency/AgencyHeader";
import { openAgencyAlert } from "@/features/agency/openAlert";
import { useAgencyAlerts } from "@/features/agency/useAgencyAlerts";
import { useIsAgencyAdmin } from "@/features/agency/useAgency";
import { useMarkRead } from "@/features/notifications/useNotifications";
import { getIntlLocale, t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { NotificationRow } from "@/types/notifications";
import { BellOff, CircleAlert, Coins, ICON_STROKE, Receipt, UserPlus, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Divider } from "@/ui/Section";
import { PullRefresh } from "@/ui/PullRefresh";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { StatusBarScrim, useStatusBarScrim } from "@/ui/StatusBarScrim";
import { Text } from "@/ui/Text";
import { useRefreshOffset } from "@/ui/Screen";

/** Pure: the icon and colour of an agency alert, by its event. */
export function alertLook(type: string): { icon: IconComponent; tone: "success" | "danger" | "warning" } {
  if (type.includes("client_signup")) return { icon: UserPlus, tone: "success" };
  if (type.includes("pool_short") || type.includes("recharge")) return { icon: Coins, tone: "warning" };
  if (type.includes("payment_failed") || type.includes("suspended")) return { icon: CircleAlert, tone: "danger" };
  return { icon: Receipt, tone: "warning" };
}

/** What happened in the agency that needs the admins: new clients, payments, plan and credit-pool problems. */
export default function AgencyAlerts() {
  const refreshOffset = useRefreshOffset();
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const scrim = useStatusBarScrim();
  const admin = useIsAgencyAdmin();
  const alerts = useAgencyAlerts();
  const markRead = useMarkRead();

  const open = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate(n.id);
    openAgencyAlert({ action_url: n.metadata?.action_url, agency_id: n.metadata?.agency_id, client_id: n.metadata?.client_id });
  };

  const empty = alerts.isPending ? (
    <DelayedFallback>
      <SkeletonList rows={5} />
    </DelayedFallback>
  ) : alerts.isError ? (
    <ErrorState offline={!online} message={online ? userMessage(alerts.error) : undefined} onRetry={() => void alerts.refetch()} />
  ) : (
    <EmptyState icon={BellOff} title={t("agency.alerts.emptyTitle")} message={admin ? t("agency.alerts.emptyMessage") : t("agency.alerts.adminsOnly")} />
  );

  return (
    <View style={styles.fill}>
      {!online ? <OfflineBanner /> : null}
      <FlashList
        onScroll={scrim.onScroll}
        scrollEventThrottle={32}
        data={alerts.rows}
        keyExtractor={(n) => String(n.id)}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<PullRefresh busy={alerts.isRefetching} onRefresh={() => void alerts.refetch()} progressViewOffset={refreshOffset} />}
        ItemSeparatorComponent={RowDivider}
        ListHeaderComponent={<AgencyHeader area="account" title={t("agency.tabs.alerts")} summary={alerts.unread ? t("notif.unreadCount", { count: alerts.unread }) : t("agency.alerts.summary")} />}
        ListEmptyComponent={empty}
        ListFooterComponent={<View style={styles.footer} />}
        renderItem={({ item }) => {
          const look = alertLook(`${item.type} ${item.metadata?.event ?? ""}`);
          const Icon = look.icon;
          const unread = !item.read_at;
          return (
            <PressableScale onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={[item.title, item.message, unread ? t("state.unread") : null].filter(Boolean).join(". ")} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors[`${look.tone}Surface`] }]}>
                <Icon size={18} color={colors[look.tone]} strokeWidth={ICON_STROKE + 0.25} />
              </View>
              <View style={styles.text}>
                <View style={styles.titleLine}>
                  <Text variant="callout" weight={unread ? "semibold" : "regular"} numberOfLines={2} style={styles.flex}>
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {relativeTime(item.created_at, locale)}
                  </Text>
                </View>
                {item.message ? (
                  <Text variant="footnote" tone="muted" numberOfLines={3}>
                    {item.message}
                  </Text>
                ) : null}
              </View>
              {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </PressableScale>
          );
        }}
      />
      <StatusBarScrim shown={scrim.shown} />
    </View>
  );
}

function RowDivider() {
  return <Divider inset={gutter + 40 + space.md} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingHorizontal: gutter, paddingVertical: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0, gap: 2 },
  titleLine: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  flex: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  footer: { height: 96 },
});
