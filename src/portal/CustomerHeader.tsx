import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Backdrop } from "@/ui/Backdrop";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { useActivePortal } from "./portalSession";

/**
 * The header of every customer tab: the business's logo and name (the portal is theirs, not GrowthReach.ai's), the
 * customer on the right (opens Me), then a bold title and one line of status.
 */
/** `greeting`: Home's "Good afternoon," with the first name large under it, instead of the plain title. */
export function CustomerHeader({ title, summary, greeting, children }: { title: string; summary?: string | null; greeting?: { hello: string; name?: string }; children?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const portal = useActivePortal();
  const business = portal?.branding?.business_name ?? "";
  const me = portal?.customer.name || portal?.customer.email || "?";
  return (
    <View style={[styles.band, { paddingTop: insets.top + space.md }]}>
      <Backdrop area="today" />
      <View style={styles.row}>
        <View style={styles.business} accessible accessibilityLabel={business}>
          <Avatar name={business || "?"} uri={portal?.branding?.logo_url} size={36} />
          <Text variant="headline" numberOfLines={1} style={styles.flex}>
            {business}
          </Text>
        </View>
        <PressableScale
          onPress={() => {
            haptics.selection();
            router.navigate("/customer/me" as Href);
          }}
          accessibilityLabel={t("portal.tabs.me")}
        >
          <Avatar name={me} size={40} accent />
        </PressableScale>
      </View>
      <View style={styles.titles}>
        {greeting ? (
          <View accessible accessibilityRole="header" accessibilityLabel={title}>
            <Text variant="callout" tone="muted">
              {greeting.name ? `${greeting.hello},` : greeting.hello}
            </Text>
            {greeting.name ? (
              <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text }}>
                {`${greeting.name}.`}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2} style={{ color: colors.text }}>
            {title}
          </Text>
        )}
        {summary ? (
          <Text variant="subhead" tone="muted" numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  business: { flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1, minWidth: 0 },
  flex: { flexShrink: 1 },
  titles: { gap: 2 },
});
