import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { space, type Palette } from "@/theme/tokens";
import type { TimelineItem } from "@/types/contact";
import { Calendar, CircleAlert, ExternalLink, Mail, MailOpen, MessageCircle, Phone, Receipt, Send, StickyNote, type IconComponent } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { eventTitle } from "./timelineEvent";

type Look = { icon: IconComponent; bg: keyof Palette; fg: keyof Palette };

const KIND: Record<string, Look> = {
  note: { icon: StickyNote, bg: "surfaceTertiary", fg: "text" },
  call: { icon: Phone, bg: "surfaceTertiary", fg: "text" },
  voice_call: { icon: Phone, bg: "surfaceTertiary", fg: "text" },
  ai_voice_call: { icon: Phone, bg: "surfaceTertiary", fg: "text" },
  email: { icon: Mail, bg: "primarySubtle", fg: "primary" },
  meeting: { icon: Calendar, bg: "primarySubtle", fg: "primary" },
  whatsapp_message: { icon: MessageCircle, bg: "surfaceTertiary", fg: "text" },
  linkedin_message: { icon: MessageCircle, bg: "surfaceTertiary", fg: "text" },
  invoice_sent: { icon: Receipt, bg: "primarySubtle", fg: "primary" },
  invoice_paid: { icon: Receipt, bg: "surfaceTertiary", fg: "text" },
};

/** Campaign events: blue while it's on its way, green for a reply, red for a bounce. */
const CAMPAIGN: Record<string, Look> = {
  sent: { icon: Send, bg: "surfaceTertiary", fg: "text" },
  opened: { icon: MailOpen, bg: "surfaceTertiary", fg: "text" },
  clicked: { icon: ExternalLink, bg: "surfaceTertiary", fg: "text" },
  replied: { icon: MessageCircle, bg: "surfaceTertiary", fg: "text" },
  bounced: { icon: CircleAlert, bg: "dangerSurface", fg: "danger" },
};

const OTHER: Look = { icon: CircleAlert, bg: "surfaceTertiary", fg: "textSecondary" };

/** How one event looks and what it's called (the name's rules are in timelineEvent.ts). */
function describe(it: TimelineItem): Look & { title: string } {
  const look = (it.source === "campaign" ? CAMPAIGN[it.type] : undefined) ?? KIND[it.type] ?? OTHER;
  const name = eventTitle(it);
  return { ...look, title: "key" in name ? t(name.key) : name.text };
}

/** The contact's history, newest first: a thin line with a small dot per event (the newest in the accent), a
 *  spaced date label, the event and its detail. */
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
        const first = i === 0;
        const last = i === items.length - 1;
        return (
          <View key={`${it.source}-${it.id}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, first ? { backgroundColor: colors.primaryFill, borderColor: colors.primarySubtle } : { backgroundColor: colors.surface, borderColor: colors.borderStrong }]} />
              {!last ? <View style={[styles.line, { backgroundColor: colors.borderStrong }]} /> : null}
            </View>
            <View style={[styles.body, !last && styles.gap]}>
              <Text variant="eyebrow" tone="muted" numeric numberOfLines={1}>
                {[relativeTime(it.occurred_at, locale), it.user?.name].filter(Boolean).join(" · ")}
              </Text>
              {/* Two lines: "Invoice INV-0001 paid (AED 1,208.03)" shouldn't lose its amount. */}
              <Text variant="callout" weight="semibold" numberOfLines={2}>
                {k.title}
              </Text>
              {it.body ? (
                <Text variant="footnote" tone="muted" numberOfLines={4}>
                  {it.body}
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
  rail: { alignItems: "center", width: 16, paddingTop: 2 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  line: { width: 2, flex: 1, marginVertical: 3, borderRadius: 1 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  gap: { paddingBottom: space.lg + 2 },
});
