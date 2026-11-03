import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import type { TimelineItem } from "@/types/contact";
import { Calendar, CircleAlert, ExternalLink, ICON_STROKE, Mail, MailOpen, MessageCircle, Phone, Receipt, Send, StickyNote, type IconComponent } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { eventTitle } from "./timelineEvent";

type Look = { icon: IconComponent; bg: keyof Palette; fg: keyof Palette };

const KIND: Record<string, Look> = {
  note: { icon: StickyNote, bg: "warningSurface", fg: "warning" },
  call: { icon: Phone, bg: "successSurface", fg: "success" },
  voice_call: { icon: Phone, bg: "successSurface", fg: "success" },
  ai_voice_call: { icon: Phone, bg: "successSurface", fg: "success" },
  email: { icon: Mail, bg: "primarySubtle", fg: "primary" },
  meeting: { icon: Calendar, bg: "primarySubtle", fg: "primary" },
  whatsapp_message: { icon: MessageCircle, bg: "successSurface", fg: "success" },
  linkedin_message: { icon: MessageCircle, bg: "infoSurface", fg: "info" },
  invoice_sent: { icon: Receipt, bg: "primarySubtle", fg: "primary" },
  invoice_paid: { icon: Receipt, bg: "successSurface", fg: "success" },
};

/** Campaign events: blue while it's on its way, green for a reply, red for a bounce. */
const CAMPAIGN: Record<string, Look> = {
  sent: { icon: Send, bg: "infoSurface", fg: "info" },
  opened: { icon: MailOpen, bg: "infoSurface", fg: "info" },
  clicked: { icon: ExternalLink, bg: "infoSurface", fg: "info" },
  replied: { icon: MessageCircle, bg: "successSurface", fg: "success" },
  bounced: { icon: CircleAlert, bg: "dangerSurface", fg: "danger" },
};

const OTHER: Look = { icon: CircleAlert, bg: "surfaceTertiary", fg: "textSecondary" };

/** How one event looks and what it's called (the name's rules are in timelineEvent.ts). */
function describe(it: TimelineItem): Look & { title: string } {
  const look = (it.source === "campaign" ? CAMPAIGN[it.type] : undefined) ?? KIND[it.type] ?? OTHER;
  const name = eventTitle(it);
  return { ...look, title: "key" in name ? t(name.key) : name.text };
}

/** The contact's history, newest first, as a vertical line of events. */
export function Timeline({ items, locale }: { items: TimelineItem[]; locale: string }) {
  const { colors } = useTheme();
  if (items.length === 0) {
    return (
      <Text variant="subhead" tone="muted" style={styles.empty}>
        {t("contacts.noActivity")}
      </Text>
    );
  }
  return (
    <View>
      {items.map((it, i) => {
        const k = describe(it);
        const Icon = k.icon;
        const last = i === items.length - 1;
        return (
          <View key={`${it.source}-${it.id}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: colors[k.bg] }]}>
                <Icon size={15} color={colors[k.fg]} strokeWidth={ICON_STROKE + 0.25} />
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={[styles.body, !last && styles.gap]}>
              <View style={styles.head}>
                {/* Two lines: "Invoice INV-0001 paid (AED 1,208.03)" shouldn't lose its amount. */}
                <Text variant="callout" weight="semibold" numberOfLines={2} style={styles.flex}>
                  {k.title}
                </Text>
                <Text variant="caption" tone="subtle" numeric>
                  {relativeTime(it.occurred_at, locale)}
                </Text>
              </View>
              {it.body ? (
                <Text variant="subhead" tone="secondary" numberOfLines={4}>
                  {it.body}
                </Text>
              ) : null}
              {it.user?.name ? (
                <Text variant="caption" tone="muted">
                  {it.user.name}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: space.md },
  item: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 30 },
  dot: { width: 30, height: 30, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  line: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  body: { flex: 1, minWidth: 0, gap: 2, paddingTop: 4 },
  gap: { paddingBottom: space.lg },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
});
