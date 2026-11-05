import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { portalAuthApi } from "@/api/portal";
import { CustomerHeader } from "@/portal/CustomerHeader";
import { goCustomer } from "@/portal/navigate";
import { portalToken, useActivePortal, usePortalSession } from "@/portal/portalSession";
import { LANGUAGES, setLanguage, t, useLanguage, type AppLanguage } from "@/i18n";
import { confirm } from "@/lib/confirm";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { HeroCard } from "@/ui/HeroCard";
import { Check, FileText, ICON_STROKE, KeyRound, LogOut, Plus } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { RowIcon } from "@/ui/RowIcon";
import { Screen } from "@/ui/Screen";
import { Divider, SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Text } from "@/ui/Text";

/** The customer's account: who they are, their businesses (switch or add one), password, documents and settings. */
export default function CustomerMe() {
  const { colors, preference, setPreference } = useTheme();
  const portal = useActivePortal();
  const sessions = usePortalSession((s) => s.sessions);
  const switchTo = usePortalSession((s) => s.switchTo);
  const signOut = usePortalSession((s) => s.signOut);
  const language = useLanguage((s) => s.language);
  const account = useQuery({ queryKey: ["portal", portal?.slug ?? "", "account"], queryFn: ({ signal }) => portalAuthApi.account(portalToken(), signal), enabled: Boolean(portal), staleTime: 5 * 60_000 });
  const name = portal?.customer.name || portal?.customer.email || "";

  return (
    <Screen contentInsetAdjustmentBehavior="never">
      <CustomerHeader title={t("portal.tabs.me")} />
      {/* Who is signed in, as the screen's one hero card (the same card as the staff More page). */}
      <View style={styles.card}>
        <HeroCard>
          <View style={styles.who}>
            <View style={[styles.avatarRing, { borderColor: colors.heroGlassBorder }]}>
              <Avatar name={name || "?"} size={56} onHero />
            </View>
            <View style={styles.flex}>
              <Text variant="title" numberOfLines={1} style={{ color: colors.onHero }}>
                {name}
              </Text>
              {portal?.customer.name ? (
                <Text variant="subhead" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
                  {portal.customer.email}
                </Text>
              ) : null}
            </View>
          </View>
        </HeroCard>
      </View>

      <SectionHeader title={t("portal.me.businesses")} />
      <Card padded={false} style={styles.card}>
        {sessions.map((s, i) => (
          <View key={s.slug}>
            {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
            <ListRow
              title={s.branding?.business_name ?? s.slug}
              subtitle={s.customer.email}
              leading={<Avatar name={s.branding?.business_name ?? s.slug} uri={s.branding?.logo_url} size={36} />}
              trailing={s.slug === portal?.slug ? <Check size={20} color={colors.primary} strokeWidth={ICON_STROKE + 0.5} /> : undefined}
              onPress={() => switchTo(s.slug)}
            />
          </View>
        ))}
        <Divider inset={gutter + 36 + space.md} />
        <ListRow
          title={t("portal.me.addBusiness")}
          leading={
            <RowIcon icon={Plus} />
          }
          chevron
          onPress={() => goCustomer("/customer/add-business")}
        />
      </Card>

      <SectionHeader title={t("portal.me.account")} />
      <Card padded={false} style={styles.card}>
        <ListRow
          title={account.data?.has_password ? t("portal.me.changePassword") : t("portal.me.setPassword")}
          subtitle={account.data?.has_password ? undefined : t("portal.me.setPasswordHint")}
          leading={
            <RowIcon icon={KeyRound} />
          }
          chevron
          onPress={() => goCustomer("/customer/password")}
        />
        <Divider inset={gutter + 36 + space.md} />
        <ListRow
          title={t("portal.docs.title")}
          subtitle={t("portal.docs.hint")}
          leading={
            <RowIcon icon={FileText} />
          }
          chevron
          onPress={() => goCustomer("/customer/documents")}
        />
      </Card>

      <SectionHeader title={t("more.appearance")} />
      <View style={styles.block}>
        <SegmentedControl<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { key: "system", label: t("appearance.system") },
            { key: "light", label: t("appearance.light") },
            { key: "dark", label: t("appearance.dark") },
          ]}
        />
      </View>
      <SectionHeader title={t("more.language")} />
      <View style={styles.block}>
        <SegmentedControl<AppLanguage> value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ key: l.code, label: l.nativeName }))} />
      </View>

      <View style={[styles.block, styles.signOut]}>
        <Button
          label={sessions.length > 1 ? t("portal.me.signOutOf", { business: portal?.branding?.business_name ?? "" }) : t("more.signOut")}
          icon={LogOut}
          variant="danger"
          fullWidth
          onPress={async () => {
            if (await confirm(t("portal.me.signOutConfirm", { business: portal?.branding?.business_name ?? "" }), t("more.signOut"), t("common.cancel"), true)) await signOut();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter },
  who: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatarRing: { borderRadius: 32, borderWidth: 2, padding: 2 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  block: { paddingHorizontal: gutter },
  signOut: { marginTop: space.xxxl, marginBottom: space.huge },
});
