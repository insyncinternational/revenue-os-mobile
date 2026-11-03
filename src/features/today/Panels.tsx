import { Linking, StyleSheet, View } from "react-native";
import { getIntlLocale, t } from "@/i18n";
import { go, openContact, openConversation } from "@/lib/navigate";
import { relativeTime } from "@/lib/format";
import { appLinkFor } from "@/lib/links";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { AiRecommendation, ConversationRow, FocusProspect } from "@/types/home";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChannelBadge } from "@/ui/ChannelIcon";
import { CircleAlert, ICON_STROKE, Lightbulb, Mail, Phone, Target, TrendingUp, type IconComponent } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Divider } from "@/ui/Section";
import { Text } from "@/ui/Text";

export function Conversations({ rows }: { rows: ConversationRow[] }) {
  const locale = getIntlLocale();
  return (
    <Card elevated padded={false}>
      {rows.slice(0, 3).map((c, i) => (
        <View key={c.item_id}>
          {i > 0 ? <Divider inset={space.lg + 44 + space.md} /> : null}
          <ListRow
            title={c.contact_name}
            subtitle={c.preview}
            meta={c.last_message_at ? relativeTime(c.last_message_at, locale) : null}
            unread={c.unread}
            onPress={() => openConversation(c.item_id)}
            leading={
              <View>
                <Avatar name={c.contact_name} size={44} />
                <View style={styles.channel}>
                  <ChannelBadge channel={c.channel} />
                </View>
              </View>
            }
          />
        </View>
      ))}
    </Card>
  );
}

const INTENT_TONE = { high: "danger", medium: "warning", low: "neutral" } as const;

export function Focus({ prospect }: { prospect: FocusProspect }) {
  const { colors } = useTheme();
  const p = prospect;
  const act = p.recommended_action;
  const canCall = act.kind === "call" && !!p.phone;
  const canEmail = act.kind === "email" && !!p.email;
  return (
    <Card elevated contentStyle={styles.focus}>
      <View style={styles.focusHead}>
        <Avatar name={p.name} uri={p.photo_url} size={52} />
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={1}>
            {p.name}
          </Text>
          <Text variant="subhead" tone="muted" numberOfLines={1}>
            {[p.role, p.company].filter(Boolean).join(" · ")}
          </Text>
          <View style={styles.badges}>
            <Badge label={t(p.intent === "high" ? "today.intentHigh" : p.intent === "medium" ? "today.intentMedium" : "today.intentLow")} tone={INTENT_TONE[p.intent]} />
            {p.icp_fit != null ? <Badge label={t("today.fit", { score: Math.round(p.icp_fit) })} tone="brand" /> : null}
          </View>
        </View>
      </View>
      {p.signals.length > 0 ? (
        <View style={styles.signals}>
          {p.signals.slice(0, 2).map((s) => (
            <View key={s.id} style={[styles.signal, { backgroundColor: colors.surfaceSecondary }]}>
              <TrendingUp size={14} color={colors.primary} strokeWidth={ICON_STROKE + 0.25} />
              <Text variant="footnote" tone="secondary" numberOfLines={1} style={styles.flex}>
                {s.title}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text variant="subhead" tone="secondary">
        {act.reason}
      </Text>
      {canCall ? <Button label={act.label} icon={Phone} fullWidth onPress={() => void Linking.openURL(`tel:${p.phone!.replace(/[^\d+]/g, "")}`)} /> : null}
      {canEmail ? <Button label={act.label} icon={Mail} fullWidth onPress={() => void Linking.openURL(`mailto:${p.email}`)} /> : null}
      <Button label={t("today.viewContact")} variant="ghost" fullWidth onPress={() => openContact(p.lead_id)} />
    </Card>
  );
}

const TONE_ICON: Record<AiRecommendation["tone"], { icon: IconComponent; bg: "successSurface" | "warningSurface" | "dangerSurface"; fg: "success" | "warning" | "danger" }> = {
  opportunity: { icon: Target, bg: "successSurface", fg: "success" },
  attention: { icon: Lightbulb, bg: "warningSurface", fg: "warning" },
  risk: { icon: CircleAlert, bg: "dangerSurface", fg: "danger" },
};

export function Suggestions({ items }: { items: AiRecommendation[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.suggestions}>
      {items.slice(0, 3).map((r) => {
        const tone = TONE_ICON[r.tone] ?? TONE_ICON.attention;
        const Icon = tone.icon;
        const target = appLinkFor(r.href);
        return (
          <Card key={r.key} contentStyle={styles.suggestion}>
            <View style={[styles.sIcon, { backgroundColor: colors[tone.bg] }]}>
              <Icon size={18} color={colors[tone.fg]} strokeWidth={ICON_STROKE + 0.25} />
            </View>
            <Text variant="subhead" style={styles.flex}>
              {r.text}
            </Text>
            {target ? <Button label={r.action} size="sm" variant="ghost" onPress={() => go(target)} /> : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  channel: { position: "absolute", right: -3, bottom: -3 },
  flex: { flex: 1, minWidth: 0 },
  focus: { gap: space.md },
  focusHead: { flexDirection: "row", gap: space.md, alignItems: "center" },
  badges: { flexDirection: "row", gap: space.xs, marginTop: space.xs, flexWrap: "wrap" },
  signals: { gap: space.xs },
  signal: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md },
  suggestions: { gap: space.sm },
  suggestion: { flexDirection: "row", alignItems: "center", gap: space.md },
  sIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
