import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { inboxApi } from "@/api/inbox";
import { userMessage } from "@/api/errors";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { money, relativeTime } from "@/lib/format";
import { openContact, openDeal } from "@/lib/navigate";
import { useActiveBaseId, useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChannelGlyph, type Channel } from "@/ui/ChannelIcon";
import { ChevronRight, ICON_STROKE, Mail, Phone, UserRound, X } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { PressableScale } from "@/ui/PressableScale";
import { Divider } from "@/ui/Section";
import { Skeleton } from "@/ui/Skeleton";
import { EmptyState, ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

const CHANNELS = new Set<string>(["email", "whatsapp", "linkedin", "sms", "call"]);

/** Who you're talking to, without leaving the conversation: details, owner, open deals, last contact per channel. */
export default function ContactPeek() {
  const { itemId = "" } = useLocalSearchParams<{ itemId: string }>();
  const baseId = useActiveBaseId() ?? 0;
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const seeMoney = useCan("deals_money");
  const ctx = useQuery({
    queryKey: ["inbox", baseId, "context", itemId],
    queryFn: ({ signal }) => inboxApi.context(baseId, itemId, signal),
    enabled: baseId > 0 && Boolean(itemId),
    staleTime: 60_000,
  });
  const lead = ctx.data?.lead;
  const phone = lead?.phone?.replace(/[^\d+]/g, "") || null;
  const sub = lead ? [lead.role, lead.company].filter(Boolean).join(" · ") : "";

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <IconButton icon={X} label={t("common.close")} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {ctx.isPending ? (
          <View style={styles.head}>
            <Skeleton width={64} height={64} round />
            <Skeleton width={160} height={20} />
            <Skeleton width={120} height={14} />
          </View>
        ) : ctx.isError ? (
          <ErrorState message={userMessage(ctx.error)} onRetry={() => void ctx.refetch()} />
        ) : !lead ? (
          <EmptyState icon={UserRound} title={t("peek.noContact")} message={t("peek.noContactMessage")} />
        ) : (
          <>
            <View style={styles.head}>
              <Avatar name={lead.name} size={64} />
              <Text variant="title" align="center" numberOfLines={2}>
                {lead.name}
              </Text>
              {sub ? (
                <Text variant="subhead" tone="muted" align="center" numberOfLines={2}>
                  {sub}
                </Text>
              ) : null}
              <View style={styles.badges}>
                {lead.tier ? <Badge label={lead.tier} tone="brand" /> : null}
                {lead.score != null ? <Badge label={t("peek.score", { score: lead.score })} tone="neutral" /> : null}
                {ctx.data?.owner ? <Badge label={t("peek.owner", { name: ctx.data.owner.name })} tone="neutral" /> : null}
              </View>
              <View style={styles.actions}>
                {phone ? <Button label={t("contacts.call")} icon={Phone} size="sm" variant="secondary" onPress={() => void Linking.openURL(`tel:${phone}`)} /> : null}
                {lead.email ? <Button label={t("contacts.email")} icon={Mail} size="sm" variant="secondary" onPress={() => void Linking.openURL(`mailto:${lead.email}`)} /> : null}
                <Button
                  label={t("peek.openContact")}
                  icon={UserRound}
                  size="sm"
                  onPress={() => {
                    router.back();
                    setTimeout(() => openContact(lead.id), 250);
                  }}
                />
              </View>
            </View>

            {ctx.data!.deals.length > 0 ? (
              <>
                <Text variant="footnote" weight="semibold" tone="muted" style={styles.label}>
                  {t("contacts.deals").toUpperCase()}
                </Text>
                <Card padded={false}>
                  {ctx.data!.deals.map((d, i) => {
                    const amount = d.amount != null ? Number(d.amount) : null;
                    return (
                      <View key={d.id}>
                        {i > 0 ? <Divider inset={space.lg} /> : null}
                        <PressableScale
                          onPress={() => {
                            router.back();
                            setTimeout(() => openDeal(d.id), 250);
                          }}
                          accessibilityLabel={d.name}
                          scaleTo={0.99}
                          style={styles.row}
                        >
                          <View style={styles.flex}>
                            <Text variant="callout" weight="semibold" numberOfLines={1}>
                              {d.name}
                            </Text>
                            {d.stage ? (
                              <Text variant="footnote" tone="muted" numberOfLines={1}>
                                {d.stage}
                              </Text>
                            ) : null}
                          </View>
                          {seeMoney && amount != null && Number.isFinite(amount) ? (
                            <Text variant="callout" weight="semibold" numeric>
                              {money(amount, d.currency ?? "USD", locale, { compact: amount >= 100_000 })}
                            </Text>
                          ) : null}
                          <ChevronRight size={18} color={colors.textSubtle} strokeWidth={ICON_STROKE} />
                        </PressableScale>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {ctx.data!.channels.length > 0 ? (
              <>
                <Text variant="footnote" weight="semibold" tone="muted" style={styles.label}>
                  {t("peek.lastContacted").toUpperCase()}
                </Text>
                <Card padded={false}>
                  {ctx.data!.channels.map((c, i) => (
                    <View key={c.channel}>
                      {i > 0 ? <Divider inset={space.lg} /> : null}
                      <View style={styles.row}>
                        {CHANNELS.has(c.channel) ? <ChannelGlyph channel={c.channel as Channel} size={16} /> : null}
                        <Text variant="callout" style={styles.flex}>
                          {t(`peek.channel_${c.channel}` as TranslationKey)}
                        </Text>
                        <Text variant="footnote" tone="muted" numeric>
                          {relativeTime(c.last_contacted_at, locale)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: space.sm, paddingTop: space.sm },
  body: { paddingHorizontal: gutter, paddingBottom: space.huge, gap: space.sm },
  head: { alignItems: "center", gap: space.sm, paddingBottom: space.lg },
  badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginTop: space.sm },
  label: { letterSpacing: 0.4, marginTop: space.md, paddingHorizontal: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
