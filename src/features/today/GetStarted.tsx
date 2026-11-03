import { StyleSheet, View } from "react-native";
import { t, type TranslationKey } from "@/i18n";
import { openCampaigns, openContactForm, openDealForm } from "@/lib/navigate";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Card } from "@/ui/Card";
import { ICON_STROKE, KanbanSquare, Rocket, Send, UserPlus, type IconComponent } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Text } from "@/ui/Text";

type Step = { key: string; title: TranslationKey; subtitle: TranslationKey; icon: IconComponent; onPress: () => void };

/**
 * A brand-new workspace (every number zero, no deals, no conversations): one card with the first steps, in place
 * of the Performance, Pipeline and funnel sections, which would only be a wall of zeros. Each step is offered
 * only when the user may take it; with none, the card isn't shown.
 */
export function GetStarted() {
  const { colors } = useTheme();
  const contacts = useCan("contacts_create");
  const crm = useModuleEnabled("crm");
  const campaigns = useCan("campaigns_read");
  const steps: (Step | false)[] = [
    contacts && { key: "contact", title: "today.start.contact", subtitle: "today.start.contactHint", icon: UserPlus, onPress: () => openContactForm() },
    contacts && crm && { key: "deal", title: "today.start.deal", subtitle: "today.start.dealHint", icon: KanbanSquare, onPress: () => openDealForm() },
    campaigns && { key: "campaign", title: "today.start.campaign", subtitle: "today.start.campaignHint", icon: Send, onPress: openCampaigns },
  ];
  const shown = steps.filter((s): s is Step => s !== false);
  if (!shown.length) return null;

  return (
    <Card elevated padded={false}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.primarySubtle }]}>
          <Rocket size={20} color={colors.primary} strokeWidth={ICON_STROKE + 0.25} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">{t("today.start.title")}</Text>
          <Text variant="footnote" tone="muted">
            {t("today.start.body")}
          </Text>
        </View>
      </View>
      {shown.map((s) => {
        const Icon = s.icon;
        return (
          <ListRow
            key={s.key}
            title={t(s.title)}
            subtitle={t(s.subtitle)}
            chevron
            onPress={s.onPress}
            leading={
              <View style={[styles.icon, { backgroundColor: colors.surfaceTertiary }]}>
                <Icon size={18} color={colors.textSecondary} strokeWidth={ICON_STROKE + 0.25} />
              </View>
            }
          />
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: space.md, padding: space.lg, paddingBottom: space.sm },
  badge: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
