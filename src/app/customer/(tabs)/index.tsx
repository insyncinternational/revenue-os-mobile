import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { chronological, messageText, owed, splitMeetings, unpaidInvoices } from "@/portal/portal";
import { CustomerHeader } from "@/portal/CustomerHeader";
import { goCustomer as go, openBook } from "@/portal/navigate";
import { useActivePortal } from "@/portal/portalSession";
import { usePortalInvoices, usePortalMeetings, usePortalMessages } from "@/portal/usePortal";
import { QuickActions } from "@/features/today/QuickActions";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { dateTime, money, relativeTime } from "@/lib/format";
import { firstNameOf, greetingKey } from "@/lib/greeting";
import { useOnline } from "@/query/useOnline";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { HeroCard } from "@/ui/HeroCard";
import { CalendarPlus, FileText, MessageCircle, Receipt, Video, type IconComponent } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Reveal } from "@/ui/Reveal";
import { Screen } from "@/ui/Screen";
import { Skeleton } from "@/ui/Skeleton";
import { Divider, SectionHeader } from "@/ui/Section";
import { OfflineBanner } from "@/ui/States";
import { Text } from "@/ui/Text";

/** The customer's home: their next appointment, what they owe, the latest from the business, and quick actions. */
export default function CustomerHome() {
  const { colors } = useTheme();
  const online = useOnline();
  const locale = getIntlLocale();
  const portal = useActivePortal();
  const meetings = usePortalMeetings();
  const invoices = usePortalInvoices();
  const messages = usePortalMessages();
  const [now] = useState(() => Date.now());

  const refresh = () => {
    void meetings.refetch();
    void invoices.refetch();
    void messages.refetch();
  };

  const first = firstNameOf(portal?.customer.name) || undefined;
  const next = splitMeetings(meetings.data?.meetings ?? [], now).upcoming[0];
  const unpaid = unpaidInvoices(invoices.data?.invoices ?? []);
  const latest = chronological(messages.data?.messages ?? []).at(-1);

  const quick: { key: string; label: TranslationKey; icon: IconComponent; onPress: () => void }[] = [
    { key: "meeting", label: "portal.quick.book", icon: CalendarPlus, onPress: () => openBook() },
    { key: "contact", label: "portal.quick.message", icon: MessageCircle, onPress: () => go("/customer/messages") },
    { key: "deal", label: "portal.quick.invoices", icon: Receipt, onPress: () => go("/customer/invoices") },
    { key: "task", label: "portal.quick.documents", icon: FileText, onPress: () => go("/customer/documents") },
  ];

  let section = 0;
  return (
    <Screen contentInsetAdjustmentBehavior="never" onRefresh={refresh} refreshing={meetings.isRefetching || invoices.isRefetching}>
      <CustomerHeader
        title={`${t(greetingKey(new Date().getHours()))}${first ? `, ${first}` : ""}`}
        greeting={{ hello: t(greetingKey(new Date().getHours())), name: first }}
        summary={t("portal.home.summary", { business: portal?.branding?.business_name ?? "" })}
      />
      {!online ? <OfflineBanner /> : null}

      <View style={styles.pad}>
        <Reveal index={section++}>
          {/* One card in both states: the same label pill, title, line and white button on the brand colour. */}
          {!meetings.data && meetings.isPending ? (
            <Skeleton width="100%" height={196} />
          ) : (
            <HeroCard>
              <View style={[styles.tag, { backgroundColor: colors.heroGlass }]}>
                <Text variant="eyebrow" style={{ color: colors.onHero }}>
                  {t("portal.home.next")}
                </Text>
              </View>
              <Text variant="title" numberOfLines={2} style={[styles.heroTitle, { color: colors.onHero }]}>
                {next ? next.title : t("portal.home.noNext")}
              </Text>
              <Text variant="callout" style={{ color: next ? colors.onHero : colors.onHeroMuted }}>
                {next ? (next.starts_at ? dateTime(next.starts_at, locale) : "") : t("portal.home.noNextHint")}
              </Text>
              <View style={styles.heroActions}>
                {/* On the colour: the main action is the white pill, the other one glass (as on the credit pool card). */}
                {next?.join_url ? <Button label={t("portal.appt.join")} icon={Video} variant="onFill" size="sm" onPress={() => void Linking.openURL(next.join_url!)} /> : null}
                {next ? (
                  <Button label={t("portal.appt.reschedule")} variant={next.join_url ? "glass" : "onFill"} size="sm" onPress={() => openBook(next.id)} />
                ) : (
                  <Button label={t("portal.quick.book")} icon={CalendarPlus} variant="onFill" size="sm" onPress={() => openBook()} />
                )}
              </View>
            </HeroCard>
          )}
        </Reveal>
        <Reveal index={section++}>
          <QuickActions actions={quick} />
        </Reveal>
      </View>

      {unpaid.length > 0 ? (
        <Reveal index={section++}>
          <SectionHeader title={t("portal.home.toPay")} count={unpaid.length} action={t("common.seeAll")} onAction={() => go("/customer/invoices")} />
          <Card padded={false} style={styles.card}>
            {unpaid.slice(0, 3).map((i, n) => (
              <View key={i.id}>
                {n > 0 ? <Divider inset={gutter} /> : null}
                <ListRow
                  title={t("portal.inv.number", { number: i.number })}
                  subtitle={i.due_date ? t("portal.inv.due", { date: dateTime(i.due_date, locale) }) : undefined}
                  trailing={i.pay_url ? <Button label={t("portal.inv.pay", { amount: money(owed(i) / 100, i.currency.toUpperCase(), locale) })} size="sm" onPress={() => void WebBrowser.openBrowserAsync(i.pay_url!)} /> : undefined}
                />
              </View>
            ))}
          </Card>
        </Reveal>
      ) : null}

      {latest ? (
        <Reveal index={section++}>
          <SectionHeader title={t("portal.home.latest")} action={t("common.seeAll")} onAction={() => go("/customer/messages")} />
          <Card padded={false} style={styles.card}>
            <ListRow
              title={latest.from === "business" ? (portal?.branding?.business_name ?? "") : t("portal.msg.you")}
              subtitle={messageText(latest.body)}
              subtitleLines={2}
              meta={latest.created_at ? relativeTime(latest.created_at, locale) : undefined}
              chevron
              onPress={() => go("/customer/messages")}
            />
          </Card>
        </Reveal>
      ) : null}
      <View style={styles.footer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, gap: space.md },
  card: { marginHorizontal: gutter },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  tag: { alignSelf: "flex-start", paddingHorizontal: space.sm + 2, paddingVertical: 5, borderRadius: radius.pill, marginBottom: space.xs },
  heroTitle: { fontSize: 26, lineHeight: 31, letterSpacing: -0.7 },
  footer: { height: space.huge },
});
